import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';
import { verifyToken } from '@clerk/backend';

type Bindings = {
  DB?: D1Database;
  ONEDRIVE_CLIENT_ID?: string;
  ONEDRIVE_TENANT_ID?: string;
  ONEDRIVE_REFRESH_TOKEN?: string;
  ONEDRIVE_DRIVE_TARGET?: string;
  NEW_ONEDRIVE_CLIENT_ID?: string;
  NEW_ONEDRIVE_TENANT_ID?: string;
  NEW_ONEDRIVE_REFRESH_TOKEN?: string;
  NEW_ONEDRIVE_DRIVE_TARGET?: string;
  CLERK_SECRET_KEY?: string;
  CLERK_JWT_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// Enable CORS for all routes
app.use('*', cors());

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}
const tokenCacheByTenant = new Map<string, TokenCache>();
const refreshFailures = new Map<string, number>();
const downloadUrlCache = new Map<string, { url: string; expiresAt: number }>();
let cachedManifest: Record<string, any> = {};
let lastManifestFetch = 0;

// Lectures sit on two SharePoint tenants while content moves from 5ncjwt to openmedQ, and a Graph
// item id only resolves inside the tenant that issued it, so every request picks a tenant per item.
const LEGACY_TENANT_ID = '938a1924-0af0-4599-819b-177a1dcf8fd6';
const LEGACY_CLIENT_ID = 'ba92c830-fac7-4d60-a0ff-8bf0b581a4c4';
const NEW_TENANT_ID = '9903c5d7-b085-4596-9ee6-98f39ddba128';
const NEW_CLIENT_ID = '054e8da3-e1e0-4274-b8a9-2bb6f71ef8f8';

interface GraphTenant {
  tenantId: string;
  clientId: string;
  refreshToken: string;
  driveTarget: string;
}

interface GraphAttempt {
  tenant: GraphTenant;
  itemId: string;
}

function configuredTenants(env: Bindings): GraphTenant[] {
  const candidates: GraphTenant[] = [
    {
      tenantId: env.ONEDRIVE_TENANT_ID || LEGACY_TENANT_ID,
      clientId: env.ONEDRIVE_CLIENT_ID || LEGACY_CLIENT_ID,
      refreshToken: env.ONEDRIVE_REFRESH_TOKEN || '',
      driveTarget: env.ONEDRIVE_DRIVE_TARGET || 'sites/root/drive',
    },
    {
      tenantId: env.NEW_ONEDRIVE_TENANT_ID || NEW_TENANT_ID,
      clientId: env.NEW_ONEDRIVE_CLIENT_ID || NEW_CLIENT_ID,
      refreshToken: env.NEW_ONEDRIVE_REFRESH_TOKEN || '',
      driveTarget: env.NEW_ONEDRIVE_DRIVE_TARGET || 'sites/root/drive',
    },
  ].filter((t) => !!t.refreshToken);

  const unique = new Map<string, GraphTenant>();
  for (const tenant of candidates) {
    if (!unique.has(tenant.tenantId)) unique.set(tenant.tenantId, tenant);
  }
  return [...unique.values()];
}

function tenantIdForItem(item: any): string | undefined {
  const url = String(item?.web_url || '').toLowerCase();
  if (url.includes('openmedq')) return NEW_TENANT_ID;
  if (url.includes('5ncjwt')) return LEGACY_TENANT_ID;
  const path = String(item?.onedrive_path || '');
  // Uploads and cloud-to-cloud migrations write into these program folders on openmedQ; the legacy
  // tenant keeps the numeric-prefixed names (01_PrepLadder_X_English/, 04_Marrow_Edition_6/).
  return /^\/Aspirin_LMS\/(PrepLadder_X|PrepLadder_X_Hinglish|Marrow_E6|Cerebellum|Legacy_Catalog)\//.test(path)
    ? NEW_TENANT_ID
    : undefined;
}

function graphAttempts(env: Bindings, item: any): GraphAttempt[] {
  const tenants = configuredTenants(env);
  if (tenants.length === 0) return [];
  const hint = tenantIdForItem(item);
  const rest = tenants.filter((t) => t.tenantId !== hint);
  const preferred = hint ? tenants.filter((t) => t.tenantId === hint) : [];
  const primary = String(item.onedrive_item_id);
  // Migrated rows keep the id of the copy still held on the other tenant as an escape hatch.
  const twin = item.source_onedrive_item_id ? String(item.source_onedrive_item_id) : '';
  const targets =
    twin && twin !== primary
      ? [
          { itemId: primary, order: [...preferred, ...rest] },
          { itemId: twin, order: [...rest, ...preferred] },
        ]
      : [{ itemId: primary, order: [...preferred, ...rest] }];

  const attempts: GraphAttempt[] = [];
  for (const target of targets) {
    for (const tenant of target.order) {
      if (!attempts.some((a) => a.tenant.tenantId === tenant.tenantId && a.itemId === target.itemId)) {
        attempts.push({ tenant, itemId: target.itemId });
      }
    }
  }
  return attempts;
}

async function getGraphAccessToken(tenant: GraphTenant): Promise<string | null> {
  const now = Date.now();
  const cached = tokenCacheByTenant.get(tenant.tenantId);
  if (cached && cached.expiresAt > now + 60000) {
    return cached.accessToken;
  }
  // Back off after a failed refresh instead of re-hammering the IdP on every range request.
  const failedAt = refreshFailures.get(tenant.tenantId);
  if (failedAt && now - failedAt < 60000) return null;

  try {
    const res = await fetch(`https://login.microsoftonline.com/${tenant.tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: tenant.clientId,
        grant_type: 'refresh_token',
        refresh_token: tenant.refreshToken,
      }),
    });
    if (!res.ok) {
      refreshFailures.set(tenant.tenantId, now);
      return null;
    }
    const data: any = await res.json();
    const token: TokenCache = {
      accessToken: data.access_token,
      expiresAt: now + (data.expires_in || 3600) * 1000,
    };
    tokenCacheByTenant.set(tenant.tenantId, token);
    refreshFailures.delete(tenant.tenantId);
    return token.accessToken;
  } catch (e) {
    refreshFailures.set(tenant.tenantId, now);
    return null;
  }
}

async function graphFetch(
  env: Bindings,
  item: any,
  buildPath: (attempt: GraphAttempt) => string,
  init?: RequestInit,
  isAcceptable: (status: number) => boolean = (s) => s >= 200 && s < 300
): Promise<Response | null> {
  for (const attempt of graphAttempts(env, item)) {
    const token = await getGraphAccessToken(attempt.tenant);
    if (!token) continue;
    try {
      const res = await fetch(`https://graph.microsoft.com/v1.0/${buildPath(attempt)}`, {
        ...init,
        headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}` },
      });
      if (isAcceptable(res.status)) return res;
    } catch (e) {
      // Try the remaining tenant / stored copy for this item
    }
  }
  return null;
}

async function getOneDriveDownloadUrl(env: Bindings, item: any): Promise<string | null> {
  const itemId = String(item.onedrive_item_id);
  const now = Date.now();
  const cached = downloadUrlCache.get(itemId);
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  const res = await graphFetch(
    env,
    item,
    (attempt) => `${attempt.tenant.driveTarget}/items/${attempt.itemId}?$select=@microsoft.graph.downloadUrl`
  );
  if (!res) return null;

  try {
    const data: any = await res.json();
    const downloadUrl = data['@microsoft.graph.downloadUrl'];
    if (downloadUrl) {
      downloadUrlCache.set(itemId, { url: downloadUrl, expiresAt: now + 45 * 60 * 1000 });
      return downloadUrl;
    }
  } catch (e) {
    // Malformed Graph payload
  }
  return null;
}

const thumbnailUrlCache = new Map<string, { url: string; expiresAt: number }>();

async function getOneDriveThumbnailUrl(env: Bindings, item: any, size: string = 'c640x360'): Promise<string | null> {
  const itemId = String(item.onedrive_item_id);
  const cacheKey = `${itemId}_${size}`;
  const now = Date.now();
  const cached = thumbnailUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  const contentRes = await graphFetch(
    env,
    item,
    (attempt) => `${attempt.tenant.driveTarget}/items/${attempt.itemId}/thumbnails/0/${size}/content`,
    { redirect: 'manual' },
    (s) => s === 200 || s === 302
  );
  if (contentRes && contentRes.status === 302) {
    const location = contentRes.headers.get('location');
    if (location) {
      thumbnailUrlCache.set(cacheKey, { url: location, expiresAt: now + 2 * 60 * 60 * 1000 });
      return location;
    }
  }

  const listRes = await graphFetch(
    env,
    item,
    (attempt) => `${attempt.tenant.driveTarget}/items/${attempt.itemId}/thumbnails`
  );
  if (listRes) {
    try {
      const data: any = await listRes.json();
      const directUrl = data.value?.[0]?.large?.url || data.value?.[0]?.medium?.url;
      if (directUrl) {
        thumbnailUrlCache.set(cacheKey, { url: directUrl, expiresAt: now + 2 * 60 * 60 * 1000 });
        return directUrl;
      }
    } catch (e) {
      // Malformed Graph payload
    }
  }
  return null;
}

const GITHUB_MANIFEST_URL = 'https://raw.githubusercontent.com/helpmtmschool-hub/aspirin/main/engine/transfer_manifest.json';
const MANIFEST_TTL_MS = 60000;
// raw.githubusercontent.com is the slowest hop in this Worker (measured 1.7-2.7s to first byte on a cold
// isolate). The deployment ships the same file as a compressed edge asset, so a cold isolate serves that
// within a short budget and adopts the GitHub copy as soon as it lands.
const MANIFEST_COLD_BUDGET_MS = 400;

async function readManifestJson(url: string, ctx: WaitUntilContext): Promise<Record<string, any> | null> {
  // The Workers edge cache keeps raw.githubusercontent.com off the cold-isolate path without new storage.
  try {
    const hit = await caches.default.match(url);
    if (hit && hit.ok) {
      const hitData: any = await hit.json();
      if (hitData && Object.keys(hitData).length > 0) return hitData;
    }
  } catch (e) {
    // Cache API unavailable for this request; go to origin
  }
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    const data: any = text ? JSON.parse(text) : null;
    if (data && Object.keys(data).length > 0) {
      ctx.waitUntil(
        caches.default.put(
          url,
          new Response(text, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' } })
        )
      );
    }
    return data;
  } catch (e) {
    return null;
  }
}

async function refreshManifestFromGitHub(ctx: WaitUntilContext): Promise<void> {
  const data = await readManifestJson(GITHUB_MANIFEST_URL, ctx);
  if (data) {
    cachedManifest = data;
    lastManifestFetch = Date.now();
  }
}

const PROXY_FIRST_CHUNK_BYTES = 16 * 1024 * 1024;

function isDocumentItem(item: any): boolean {
  return /\.(pdf|epub)$/i.test(String(item?.filename || ''));
}

// An open-ended range would pull the entire lecture through the Worker; bound the first chunk and let the
// player continue with explicit ranges.
function boundOpenRange(range: string | undefined): string | undefined {
  if (!range) return undefined;
  const open = /^bytes=(\d+)-$/i.exec(range.trim());
  if (!open) return range;
  const start = Number(open[1]);
  return `bytes=${start}-${start + PROXY_FIRST_CHUNK_BYTES - 1}`;
}

async function serveCloudFile(c: any, item: any, allowRedirect: boolean): Promise<Response | null> {
  const directUrl = await getOneDriveDownloadUrl(c.env, item);
  if (!directUrl) return null;

  // Videos leave Cloudflare out of the data path: the browser ranges against SharePoint directly, which
  // is what low-end tablets need (proxying collapsed to 0.25 MiB/s under their parallel range pattern).
  if (allowRedirect && c.req.query('proxy') !== '1') {
    c.header('Cache-Control', 'private, no-store');
    return c.redirect(directUrl, 302);
  }

  const upstreamHeaders: Record<string, string> = {};
  const range = boundOpenRange(c.req.header('range'));
  if (range) upstreamHeaders['Range'] = range;

  const upstreamRes = await fetch(directUrl, { headers: upstreamHeaders });
  const headers = new Headers();
  headers.set('Content-Type', upstreamRes.headers.get('content-type') || (isDocumentItem(item) ? 'application/pdf' : 'video/mp4'));
  headers.set('Accept-Ranges', 'bytes');
  if (upstreamRes.headers.get('content-range')) headers.set('Content-Range', upstreamRes.headers.get('content-range')!);
  if (upstreamRes.headers.get('content-length')) headers.set('Content-Length', upstreamRes.headers.get('content-length')!);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
  // A signed URL expires and partial bodies must never be shared from a cache.
  headers.set('Cache-Control', 'private, no-store');

  return new Response(upstreamRes.body, { status: upstreamRes.status, headers });
}

// Structural type: Hono's ExecutionContext and @cloudflare/workers-types disagree on field names.
interface WaitUntilContext {
  waitUntil(promise: Promise<any>): void;
}

async function getManifest(assetOrigin: string, ctx: WaitUntilContext): Promise<Record<string, any>> {
  const now = Date.now();
  if (Object.keys(cachedManifest).length > 0) {
    if (now - lastManifestFetch > MANIFEST_TTL_MS) ctx.waitUntil(refreshManifestFromGitHub(ctx));
    return cachedManifest;
  }
  // Cold isolate: answer from the deployment's own copy if GitHub is slower than the budget, then adopt the
  // GitHub copy in the background so freshly migrated lectures still appear without a redeploy.
  const pendingGitHub = refreshManifestFromGitHub(ctx);
  const fromAssets = new Promise<Record<string, any> | null>((resolve) => {
    setTimeout(async () => resolve(await readManifestJson(`${assetOrigin}/transfer_manifest.json`, ctx)), MANIFEST_COLD_BUDGET_MS);
  });
  const winner = await Promise.race([pendingGitHub, fromAssets]);
  if (winner) {
    cachedManifest = winner;
    lastManifestFetch = Date.now();
  }
  ctx.waitUntil(pendingGitHub);
  return cachedManifest;
}

function resolveManifestItem(manifest: Record<string, any>, chatId: string | number, messageId: string | number): any {
  if (!manifest) return null;
  const cId = String(chatId);
  const mId = String(messageId);

  // 1. Direct platform prefix lookups (mr_ = Marrow, px_ = PrepLadder, cb_ = Cerebellum)
  const direct = manifest[`mr_${cId}_${mId}`] ||
                 manifest[`px_${cId}_${mId}`] ||
                 manifest[`cb_${cId}_${mId}`] ||
                 manifest[`${cId}_${mId}`];
  if (direct) return direct;

  // 2. Suffix match (_chatId_messageId)
  const suffix = `_${cId}_${mId}`;
  for (const [key, val] of Object.entries(manifest)) {
    if (key.endsWith(suffix) || key === `${cId}_${mId}`) {
      return val;
    }
  }

  // 3. Attribute match
  for (const val of Object.values(manifest)) {
    if (val && typeof val === 'object') {
      const matchChat = String(val.telegram_chat_id || val.chat_id || '');
      const matchMsg = String(val.telegram_message_id || val.message_id || '');
      if (matchChat === cId && matchMsg === mId) {
        return val;
      }
    }
  }

  return null;
}

// Clerk Networkless / Edge Authentication Helper
async function authenticateUser(c: any): Promise<{ userId: string; sessionId?: string } | null> {
  const authHeader = c.req.header('authorization') || c.req.header('Authorization');
  const queryToken = c.req.query('token');
  const cookieHeader = c.req.header('cookie') || '';
  const sessionCookie = cookieHeader
    .split(';')
    .map((s: string) => s.trim())
    .find((s: string) => s.startsWith('__session='))
    ?.split('=')[1];

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : queryToken || sessionCookie || null;

  const rawJwtKey = c.env.CLERK_JWT_KEY;
  const secretKey = c.env.CLERK_SECRET_KEY;
  const jwtKey = rawJwtKey ? rawJwtKey.replace(/\\n/g, '\n') : undefined;

  // 1. If token is present, verify with Clerk via networkless JWT Key or Secret Key
  if (token && (jwtKey || secretKey)) {
    try {
      const verified = await verifyToken(token, {
        jwtKey,
        secretKey,
      });
      if (verified && verified.sub) {
        return {
          userId: verified.sub,
          sessionId: (verified as any).sid,
        };
      }
    } catch (err) {
      console.warn('[Edge Auth] Clerk token verification failed:', err);
    }
  }

  // 2. If Clerk is not actively configured on the edge worker (dev/local), allow guest/header fallback
  if (!jwtKey && !secretKey) {
    const guestId = c.req.header('x-user-id') || 'aspirin_guest';
    return { userId: guestId };
  }

  return null;
}

// 1. GET /api/subjects - List 19 MBBS subjects with progress stats
app.get('/subjects', async (c) => {
  const db = c.env.DB;
  if (!db) {
    return c.json({ error: 'D1 Database not bound' }, 500);
  }

  try {
    const subjectsQuery = await db
      .prepare(
        `SELECT s.*, 
          COUNT(DISTINCT t.id) as total_topics,
          COUNT(DISTINCT n.id) as total_notes,
          COALESCE(SUM(CASE WHEN up.is_completed = 1 THEN 1 ELSE 0 END), 0) as completed_topics
         FROM subjects s
         LEFT JOIN topics t ON s.id = t.subject_id
         LEFT JOIN notes n ON s.id = n.subject_id
         LEFT JOIN user_progress up ON t.id = up.topic_id
         GROUP BY s.id
         ORDER BY s.display_order ASC`
      )
      .all();

    return c.json({
      subjects: subjectsQuery.results.map((sub: any) => ({
        ...sub,
        progress_percentage:
          sub.total_topics > 0
            ? Math.round((sub.completed_topics / sub.total_topics) * 100)
            : 0,
      })),
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 2. GET /api/subjects/:id - Get subject with modules & topics
app.get('/subjects/:id', async (c) => {
  const db = c.env.DB;
  const subjectId = c.req.param('id');
  if (!db) return c.json({ error: 'D1 Database not bound' }, 500);

  try {
    const subject = await db
      .prepare(`SELECT * FROM subjects WHERE id = ?`)
      .bind(subjectId)
      .first();

    if (!subject) return c.json({ error: 'Subject not found' }, 404);

    const modulesQuery = await db
      .prepare(`SELECT * FROM modules WHERE subject_id = ? ORDER BY display_order ASC`)
      .bind(subjectId)
      .all();

    const topicsQuery = await db
      .prepare(
        `SELECT t.*, 
                COALESCE(up.watched_seconds, 0) as watched_seconds, 
                COALESCE(up.is_completed, 0) as is_completed,
                COALESCE(up.is_bookmarked, 0) as is_bookmarked
         FROM topics t
         LEFT JOIN user_progress up ON t.id = up.topic_id
         WHERE t.subject_id = ?
         ORDER BY t.display_order ASC`
      )
      .bind(subjectId)
      .all();

    const notesQuery = await db
      .prepare(`SELECT * FROM notes WHERE subject_id = ?`)
      .bind(subjectId)
      .all();

    // Group topics by module
    const modules = modulesQuery.results.map((mod: any) => ({
      ...mod,
      topics: topicsQuery.results
        .filter((t: any) => t.module_id === mod.id)
        .map((t: any) => ({
          ...t,
          pearls: JSON.parse(t.pearls_json || '[]'),
        })),
    }));

    return c.json({
      subject,
      modules,
      notes: notesQuery.results,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 3. GET /api/topics/:id - Topic detail with stream URLs and pearls
app.get('/topics/:id', async (c) => {
  const db = c.env.DB;
  const topicId = c.req.param('id');
  if (!db) return c.json({ error: 'D1 Database not bound' }, 500);

  try {
    const topic: any = await db
      .prepare(
        `SELECT t.*, s.name as subject_name,
                COALESCE(up.watched_seconds, 0) as watched_seconds, 
                COALESCE(up.is_completed, 0) as is_completed,
                COALESCE(up.is_bookmarked, 0) as is_bookmarked
         FROM topics t
         JOIN subjects s ON t.subject_id = s.id
         LEFT JOIN user_progress up ON t.id = up.topic_id
         WHERE t.id = ?`
      )
      .bind(topicId)
      .first();

    if (!topic) return c.json({ error: 'Topic not found' }, 404);

    const userNotesQuery = await db
      .prepare(
        `SELECT * FROM user_notes WHERE topic_id = ? ORDER BY timestamp_seconds ASC`
      )
      .bind(topicId)
      .all();

    return c.json({
      ...topic,
      pearls: JSON.parse(topic.pearls_json || '[]'),
      stream_url: `/api/stream/${topic.telegram_chat_id}/${topic.telegram_message_id}`,
      user_notes: userNotesQuery.results,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 4. GET /api/stream/:chatId/:messageId - lectures redirect the browser to the SharePoint CDN; documents proxy
app.get('/stream/:chatId/:messageId', async (c) => {
  const { chatId, messageId } = c.req.param();

  try {
    const manifest = await getManifest(new URL(c.req.url).origin, c.executionCtx);
    const item = resolveManifestItem(manifest, chatId, messageId);

    if (item && item.onedrive_item_id && item.status === 'completed') {
      const served = await serveCloudFile(c, item, !isDocumentItem(item));
      if (served) return served;
    }
  } catch (e) {
    // Manifest or graph error handled below
  }

  return c.json(
    {
      error: 'This lecture is currently queued for cloud migration to SharePoint.',
      status: 'pending_migration',
      chat_id: chatId,
      message_id: messageId,
    },
    404
  );
});

// 5. GET /api/notes/:chatId/:messageId - Cloud-native Clinical Notes streaming via Microsoft SharePoint
// 5. GET /api/notes/:chatId/:messageId - Clinical notes and PDF textbooks (proxied so iframes render inline)
app.get('/notes/:chatId/:messageId', async (c) => {
  const { chatId, messageId } = c.req.param();

  try {
    const manifest = await getManifest(new URL(c.req.url).origin, c.executionCtx);
    const item = resolveManifestItem(manifest, chatId, messageId);

    if (item && item.onedrive_item_id && item.status === 'completed') {
      // SharePoint answers download URLs with `Content-Disposition: attachment`, which would make an iframe
      // offer a file download instead of rendering the PDF, so documents keep streaming through the Worker.
      const served = await serveCloudFile(c, item, false);
      if (served) return served;
    }
  } catch (e) {
    // Error handled below
  }

  return c.json(
    {
      error: 'This clinical note is currently queued for cloud migration to SharePoint.',
      status: 'pending_migration',
      chat_id: chatId,
      message_id: messageId,
    },
    404
  );
});

// 5.1 GET /api/thumbnail/:chatId/:messageId - Cloud-native Video Thumbnail streaming via Microsoft SharePoint Azure CDN (HTTP 302)
app.get('/thumbnail/:chatId/:messageId', async (c) => {
  const { chatId, messageId } = c.req.param();

  try {
    const manifest = await getManifest(new URL(c.req.url).origin, c.executionCtx);
    const item = resolveManifestItem(manifest, chatId, messageId);

    if (item && item.onedrive_item_id && item.status === 'completed') {
      const directUrl = await getOneDriveThumbnailUrl(c.env, item);
      if (directUrl) {
        c.header('Cache-Control', 'public, max-age=7200');
        return c.redirect(directUrl, 302);
      }
    }
  } catch (e) {
    // Handled below
  }

  return c.json(
    {
      error: 'This lecture thumbnail is currently queued for cloud migration to SharePoint.',
      status: 'pending_migration',
      chat_id: chatId,
      message_id: messageId,
    },
    404
  );
});

// 5.2 GET /api/subtitles/:chatId/:messageId - Cloud-native WebVTT subtitles streaming
app.get('/subtitles/:chatId/:messageId', async (c) => {
  const { chatId, messageId } = c.req.param();

  try {
    const manifest = await getManifest(new URL(c.req.url).origin, c.executionCtx);
    const item = resolveManifestItem(manifest, chatId, messageId);

    if (item && item.subtitles_url) {
      c.header('Cache-Control', 'public, max-age=7200');
      c.header('Access-Control-Allow-Origin', '*');
      return c.redirect(item.subtitles_url, 302);
    }
  } catch (e) {
    // Handled below
  }

  // Fallback to standard clean empty WebVTT file so browser HTML5 parser succeeds cleanly
  return new Response("WEBVTT\n\n", {
    status: 200,
    headers: {
      'Content-Type': 'text/vtt; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
});

// 6. POST /api/progress - Debounced batch or single watch progress sync
app.post('/progress', async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: 'D1 Database not bound' }, 500);

  try {
    const auth = await authenticateUser(c);
    const body: any = await c.req.json();
    const userId = auth?.userId || c.req.header('x-user-id') || body.userId || 'aspirin_guest';

    // Support both batch payload and single topic payload
    const items: any[] = Array.isArray(body.batch) ? body.batch : [body];
    if (items.length === 0) {
      return c.json({ success: true, count: 0 });
    }

    const statements = items
      .filter((item) => item && item.topicId)
      .map((item) => {
        const watchedSecs = item.watchedSeconds || 0;
        const totalSecs = item.totalSeconds || 1800;
        const isComp = item.isCompleted ? 1 : 0;
        const isBook = item.isBookmarked ? 1 : 0;

        return db
          .prepare(
            `INSERT INTO user_progress (user_id, topic_id, watched_seconds, total_seconds, is_completed, is_bookmarked, last_watched_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
             ON CONFLICT(user_id, topic_id) DO UPDATE SET
               watched_seconds = ?,
               total_seconds = ?,
               is_completed = ?,
               is_bookmarked = ?,
               last_watched_at = datetime('now'),
               updated_at = datetime('now')`
          )
          .bind(
            userId,
            item.topicId,
            watchedSecs,
            totalSecs,
            isComp,
            isBook,
            watchedSecs,
            totalSecs,
            isComp,
            isBook
          );
      });

    if (statements.length > 0) {
      await db.batch(statements);
    }

    return c.json({ success: true, synced: statements.length });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 6.1 GET /api/progress/:userId - Fetch all user progress for device sync
app.get('/progress/:userId', async (c) => {
  const db = c.env.DB;
  const paramUserId = c.req.param('userId');
  if (!db) return c.json({ error: 'D1 Database not bound' }, 500);

  try {
    const auth = await authenticateUser(c);
    const userId = auth?.userId || paramUserId || 'aspirin_guest';
    const res = await db
      .prepare(`SELECT * FROM user_progress WHERE user_id = ?`)
      .bind(userId)
      .all();

    const progressMap: Record<string, any> = {};
    (res.results || []).forEach((row: any) => {
      progressMap[row.topic_id] = {
        topicId: row.topic_id,
        watchedSeconds: row.watched_seconds,
        totalSeconds: row.total_seconds,
        isCompleted: Boolean(row.is_completed),
        isBookmarked: Boolean(row.is_bookmarked),
        lastWatchedAt: row.last_watched_at,
      };
    });

    return c.json({ success: true, progress: progressMap });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 7. 1-Device Active Session Policy (Anti-Account Sharing)
// 7.1 POST /api/sessions/register - Register new device session
app.post('/sessions/register', async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: 'D1 Database not bound' }, 500);

  try {
    const auth = await authenticateUser(c);
    const body: any = await c.req.json();
    const userId = auth?.userId || body.userId;
    const sessionId = auth?.sessionId || body.sessionId || 'default_session';
    const { deviceId, deviceName } = body;

    if (!userId || !deviceId) {
      return c.json({ error: 'Missing userId or deviceId' }, 400);
    }

    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || 'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';

    // Upsert into active sessions table
    await db
      .prepare(
        `INSERT INTO user_active_sessions (user_id, session_id, device_id, device_name, ip_address, user_agent, last_heartbeat)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET
           session_id = ?,
           device_id = ?,
           device_name = ?,
           ip_address = ?,
           user_agent = ?,
           last_heartbeat = datetime('now')`
      )
      .bind(
        userId,
        sessionId || 'default_session',
        deviceId,
        deviceName || 'Browser',
        ip,
        userAgent,
        sessionId || 'default_session',
        deviceId,
        deviceName || 'Browser',
        ip,
        userAgent
      )
      .run();

    return c.json({ success: true, activeDeviceId: deviceId });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 7.2 POST /api/sessions/heartbeat - Keepalive & concurrent device check
app.post('/sessions/heartbeat', async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: 'D1 Database not bound' }, 500);

  try {
    const auth = await authenticateUser(c);
    const body: any = await c.req.json();
    const userId = auth?.userId || body.userId;
    const { deviceId } = body;

    if (!userId || !deviceId) {
      return c.json({ active: true });
    }

    const session: any = await db
      .prepare(`SELECT * FROM user_active_sessions WHERE user_id = ?`)
      .bind(userId)
      .first();

    // If no record exists, register this device
    if (!session) {
      return c.json({ active: true });
    }

    // Check if another device took over the active session
    if (session.device_id !== deviceId) {
      return c.json({
        active: false,
        reason: 'CONCURRENT_DEVICE_DETECTED',
        activeDeviceName: session.device_name || 'Another device',
        message: 'Your account was accessed from another device. Playback paused.',
      });
    }

    // Update heartbeat timestamp
    await db
      .prepare(`UPDATE user_active_sessions SET last_heartbeat = datetime('now') WHERE user_id = ?`)
      .bind(userId)
      .run();

    return c.json({ active: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 8. POST /api/user-notes - Add timestamped clinical note
app.post('/user-notes', async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: 'D1 Database not bound' }, 500);

  try {
    const body = await c.req.json();
    const userId = c.req.header('x-user-id') || body.userId || 'aspirin_guest';
    const { topicId, timestampSeconds, noteText } = body;

    const result = await db
      .prepare(
        `INSERT INTO user_notes (user_id, topic_id, timestamp_seconds, note_text) VALUES (?, ?, ?, ?)`
      )
      .bind(userId, topicId, timestampSeconds, noteText)
      .run();

    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 8.1 GET /api/user-notes/:topicId - Fetch user notes for a topic
app.get('/user-notes/:topicId', async (c) => {
  const db = c.env.DB;
  const topicId = c.req.param('topicId');
  const userId = c.req.header('x-user-id') || c.req.query('userId') || 'aspirin_guest';
  if (!db) return c.json({ error: 'D1 Database not bound' }, 500);

  try {
    const res = await db
      .prepare(`SELECT * FROM user_notes WHERE user_id = ? AND topic_id = ? ORDER BY timestamp_seconds ASC`)
      .bind(userId, topicId)
      .all();

    return c.json({ success: true, notes: res.results || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 8.2 DELETE /api/user-notes/:id - Delete a user note
app.delete('/user-notes/:id', async (c) => {
  const db = c.env.DB;
  const noteId = c.req.param('id');
  if (!db) return c.json({ error: 'D1 Database not bound' }, 500);

  try {
    const auth = await authenticateUser(c);
    const userId = auth?.userId || c.req.header('x-user-id') || 'aspirin_guest';
    await db
      .prepare(`DELETE FROM user_notes WHERE id = ? AND user_id = ?`)
      .bind(noteId, userId)
      .run();

    return c.json({ success: true, deletedId: noteId });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 9. GET /api/search - Global search
app.get('/search', async (c) => {
  const db = c.env.DB;
  const q = c.req.query('q') || '';
  if (!db) return c.json({ error: 'D1 Database not bound' }, 500);
  if (!q.trim()) return c.json({ results: [] });

  const queryLike = `%${q}%`;
  try {
    const topics = await db
      .prepare(
        `SELECT t.*, s.name as subject_name 
         FROM topics t 
         JOIN subjects s ON t.subject_id = s.id 
         WHERE t.title LIKE ? OR t.filename LIKE ? OR t.pearls_json LIKE ?
         LIMIT 25`
      )
      .bind(queryLike, queryLike, queryLike)
      .all();

    const notes = await db
      .prepare(
        `SELECT n.*, s.name as subject_name 
         FROM notes n 
         JOIN subjects s ON n.subject_id = s.id 
         WHERE n.title LIKE ? OR n.filename LIKE ?
         LIMIT 15`
      )
      .bind(queryLike, queryLike)
      .all();

    return c.json({
      topics: topics.results.map((t: any) => ({
        ...t,
        pearls: JSON.parse(t.pearls_json || '[]'),
      })),
      notes: notes.results,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export const onRequest = handle(app);
export default app;
