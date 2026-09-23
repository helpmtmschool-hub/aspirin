import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';

type Bindings = {
  DB?: D1Database;
  STREAM_ORIGIN?: string;
  ONEDRIVE_CLIENT_ID?: string;
  ONEDRIVE_TENANT_ID?: string;
  ONEDRIVE_REFRESH_TOKEN?: string;
  ONEDRIVE_DRIVE_TARGET?: string;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// Enable CORS for all routes
app.use('*', cors());

// Helper to get stream origin
const getStreamOrigin = (env: Bindings) => env.STREAM_ORIGIN || 'http://127.0.0.1:8787';

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}
let tokenCache: TokenCache | null = null;
const downloadUrlCache = new Map<string, { url: string; expiresAt: number }>();
let cachedManifest: Record<string, any> | null = null;
let lastManifestFetch = 0;

async function getGraphAccessToken(env: Bindings): Promise<string | null> {
  const refreshToken = env.ONEDRIVE_REFRESH_TOKEN;
  if (!refreshToken) return null;

  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60000) {
    return tokenCache.accessToken;
  }

  const clientId = env.ONEDRIVE_CLIENT_ID || 'ba92c830-fac7-4d60-a0ff-8bf0b581a4c4';
  const tenantId = env.ONEDRIVE_TENANT_ID || '938a1924-0af0-4599-819b-177a1dcf8fd6';

  try {
    const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) {
      return null;
    }
    const data: any = await res.json();
    tokenCache = {
      accessToken: data.access_token,
      expiresAt: now + (data.expires_in || 3600) * 1000,
    };
    return tokenCache.accessToken;
  } catch (e) {
    return null;
  }
}

async function getOneDriveDownloadUrl(env: Bindings, itemId: string): Promise<string | null> {
  const now = Date.now();
  const cached = downloadUrlCache.get(itemId);
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  const token = await getGraphAccessToken(env);
  if (!token) return null;

  try {
    const driveTarget = env.ONEDRIVE_DRIVE_TARGET || 'sites/root/drive';
    const res = await fetch(`https://graph.microsoft.com/v1.0/${driveTarget}/items/${itemId}?$select=@microsoft.graph.downloadUrl`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const downloadUrl = data['@microsoft.graph.downloadUrl'];
    if (downloadUrl) {
      downloadUrlCache.set(itemId, { url: downloadUrl, expiresAt: now + 45 * 60 * 1000 });
      return downloadUrl;
    }
  } catch (e) {
    // Silent fallback
  }
  return null;
}

async function getManifest(): Promise<Record<string, any>> {
  const now = Date.now();
  if (cachedManifest && (now - lastManifestFetch < 60000)) {
    return cachedManifest;
  }
  try {
    const res = await fetch('https://raw.githubusercontent.com/helpmtmschool-hub/aspirin/main/engine/transfer_manifest.json');
    if (res.ok) {
      cachedManifest = await res.json();
      lastManifestFetch = now;
      return cachedManifest;
    }
  } catch (e) {
    // Fallback
  }
  return cachedManifest || {};
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

// 4. GET /api/stream/:chatId/:messageId - Edge stream router with OneDrive 302 & Stream Bridge fallback
app.get('/stream/:chatId/:messageId', async (c) => {
  const { chatId, messageId } = c.req.param();

  // 1. Check if video has been migrated to 25 TB SharePoint drive
  try {
    const manifest = await getManifest();
    const itemKey = `px_${chatId}_${messageId}`;
    const item = manifest[itemKey];

    if (item && item.onedrive_item_id && item.status === 'completed') {
      const directUrl = await getOneDriveDownloadUrl(c.env, item.onedrive_item_id);
      if (directUrl) {
        // Fast 302 redirect directly to Microsoft SharePoint global CDN
        return c.redirect(directUrl, 302);
      }
    }
  } catch (e) {
    // If manifest or OneDrive check fails, proceed to stream bridge fallback
  }

  // 2. Fallback to MTProto stream bridge
  const streamOrigin = getStreamOrigin(c.env);
  const targetUrl = `${streamOrigin}/stream/${chatId}/${messageId}`;

  const forwardHeaders: Record<string, string> = {};
  const rangeHeader = c.req.header('range');
  if (rangeHeader) {
    forwardHeaders['Range'] = rangeHeader;
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: forwardHeaders,
    });

    const responseHeaders = new Headers(upstreamRes.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type');
    responseHeaders.set(
      'Access-Control-Expose-Headers',
      'Content-Range, Content-Length, Accept-Ranges'
    );
    responseHeaders.set('Accept-Ranges', 'bytes');

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return c.json(
      {
        error: `Failed to connect to Telegram stream bridge at ${streamOrigin}: ${err.message}`,
        hint: "Ensure 'python engine/stream_bridge.py' is running, or that the lecture has finished cloud migration to SharePoint.",
      },
      502
    );
  }
});

// 5. GET /api/notes/:chatId/:messageId - Notes & PDF streaming with OneDrive 302 & Stream Bridge fallback
app.get('/notes/:chatId/:messageId', async (c) => {
  const { chatId, messageId } = c.req.param();

  // 1. Check if PDF note has been migrated to 25 TB SharePoint drive
  try {
    const manifest = await getManifest();
    const itemKey = `px_${chatId}_${messageId}`;
    const item = manifest[itemKey];

    if (item && item.onedrive_item_id && item.status === 'completed') {
      const directUrl = await getOneDriveDownloadUrl(c.env, item.onedrive_item_id);
      if (directUrl) {
        return c.redirect(directUrl, 302);
      }
    }
  } catch (e) {
    // Fallback to stream bridge
  }

  // 2. Fallback to stream bridge
  const streamOrigin = getStreamOrigin(c.env);
  const targetUrl = `${streamOrigin}/note/${chatId}/${messageId}`;

  const forwardHeaders: Record<string, string> = {};
  const rangeHeader = c.req.header('range');
  if (rangeHeader) {
    forwardHeaders['Range'] = rangeHeader;
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: forwardHeaders,
    });

    const responseHeaders = new Headers(upstreamRes.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return c.json({ error: `Failed to fetch note: ${err.message}` }, 502);
  }
});

// 5.1 GET /api/info/* - Proxy info & health checks to stream bridge
app.get('/info/:tail{.+}', async (c) => {
  const tail = c.req.param('tail');
  const streamOrigin = getStreamOrigin(c.env);
  const targetUrl = `${streamOrigin}/${tail}`;

  try {
    const upstreamRes = await fetch(targetUrl);
    const responseHeaders = new Headers(upstreamRes.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 502);
  }
});

// 6. POST /api/progress - Save watch progress and completion
app.post('/progress', async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: 'D1 Database not bound' }, 500);

  const body = await c.req.json();
  const { topicId, watchedSeconds, totalSeconds, isCompleted, isBookmarked } = body;

  try {
    await db
      .prepare(
        `INSERT INTO user_progress (topic_id, watched_seconds, total_seconds, is_completed, is_bookmarked, last_watched_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(topic_id) DO UPDATE SET
           watched_seconds = COALESCE(?, watched_seconds),
           total_seconds = COALESCE(?, total_seconds),
           is_completed = COALESCE(?, is_completed),
           is_bookmarked = COALESCE(?, is_bookmarked),
           last_watched_at = datetime('now')`
      )
      .bind(
        topicId,
        watchedSeconds || 0,
        totalSeconds || 1800,
        isCompleted ?? 0,
        isBookmarked ?? 0,
        watchedSeconds,
        totalSeconds,
        isCompleted,
        isBookmarked
      )
      .run();

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 7. POST /api/user-notes - Add timestamped clinical note
app.post('/user-notes', async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: 'D1 Database not bound' }, 500);

  const body = await c.req.json();
  const { topicId, timestampSeconds, noteText } = body;

  try {
    const result = await db
      .prepare(
        `INSERT INTO user_notes (topic_id, timestamp_seconds, note_text) VALUES (?, ?, ?)`
      )
      .bind(topicId, timestampSeconds, noteText)
      .run();

    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 8. GET /api/search - Global search
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
