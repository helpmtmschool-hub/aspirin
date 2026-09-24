import fs from 'fs';
import path from 'path';
import type { Plugin, ViteDevServer } from 'vite';

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;
const downloadUrlCache = new Map<string, { url: string; expiresAt: number }>();
let cachedManifest: Record<string, any> | null = null;
let lastManifestLoad = 0;

function getManifest(rootDir: string): Record<string, any> {
  const now = Date.now();
  if (cachedManifest && now - lastManifestLoad < 30000) {
    return cachedManifest;
  }
  const manifestPath = path.resolve(rootDir, 'engine/transfer_manifest.json');
  const publicManifestPath = path.resolve(rootDir, 'public/transfer_manifest.json');

  const pathToRead = fs.existsSync(manifestPath)
    ? manifestPath
    : fs.existsSync(publicManifestPath)
    ? publicManifestPath
    : null;

  if (pathToRead) {
    try {
      cachedManifest = JSON.parse(fs.readFileSync(pathToRead, 'utf8'));
      lastManifestLoad = now;
      return cachedManifest || {};
    } catch (e) {
      console.warn('[Aspirin Dev API] Failed to read transfer_manifest.json:', e);
    }
  }
  return cachedManifest || {};
}

async function getGraphAccessToken(rootDir: string): Promise<string | null> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60000) {
    return tokenCache.accessToken;
  }

  const tokenFile = path.resolve(rootDir, 'onedrive_token.json');
  if (!fs.existsSync(tokenFile)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
    const refreshToken = raw.refresh_token;
    if (!refreshToken) return null;

    const clientId = 'ba92c830-fac7-4d60-a0ff-8bf0b581a4c4';
    const tenantId = '938a1924-0af0-4599-819b-177a1dcf8fd6';

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
      console.warn('[Aspirin Dev API] Microsoft OAuth token refresh failed:', res.status);
      return null;
    }

    const data: any = await res.json();
    tokenCache = {
      accessToken: data.access_token,
      expiresAt: now + (data.expires_in || 3600) * 1000,
    };
    return tokenCache.accessToken;
  } catch (err) {
    console.error('[Aspirin Dev API] Error fetching Graph access token:', err);
    return null;
  }
}

async function getOneDriveDownloadUrl(rootDir: string, itemId: string): Promise<string | null> {
  const now = Date.now();
  const cached = downloadUrlCache.get(itemId);
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  const token = await getGraphAccessToken(rootDir);
  if (!token) return null;

  try {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/sites/root/drive/items/${itemId}?$select=@microsoft.graph.downloadUrl`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    const downloadUrl = data['@microsoft.graph.downloadUrl'];
    if (downloadUrl) {
      downloadUrlCache.set(itemId, { url: downloadUrl, expiresAt: now + 45 * 60 * 1000 });
      return downloadUrl;
    }
  } catch (err) {
    console.warn('[Aspirin Dev API] Graph downloadUrl fetch error:', err);
  }
  return null;
}

const thumbnailUrlCache = new Map<string, { url: string; expiresAt: number }>();

async function getOneDriveThumbnailUrl(rootDir: string, itemId: string, size: string = 'c640x360'): Promise<string | null> {
  const cacheKey = `${itemId}_${size}`;
  const now = Date.now();
  const cached = thumbnailUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  const token = await getGraphAccessToken(rootDir);
  if (!token) return null;

  try {
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/sites/root/drive/items/${itemId}/thumbnails/0/${size}/content`,
      {
        headers: { Authorization: `Bearer ${token}` },
        redirect: 'manual',
      }
    );
    if (res.status === 302) {
      const location = res.headers.get('location');
      if (location) {
        thumbnailUrlCache.set(cacheKey, { url: location, expiresAt: now + 2 * 60 * 60 * 1000 });
        return location;
      }
    }

    const listRes = await fetch(
      `https://graph.microsoft.com/v1.0/sites/root/drive/items/${itemId}/thumbnails`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (listRes.ok) {
      const data: any = await listRes.json();
      const directUrl = data.value?.[0]?.large?.url || data.value?.[0]?.medium?.url;
      if (directUrl) {
        thumbnailUrlCache.set(cacheKey, { url: directUrl, expiresAt: now + 2 * 60 * 60 * 1000 });
        return directUrl;
      }
    }
  } catch (err) {
    console.warn('[Aspirin Dev API] Graph thumbnail fetch error:', err);
  }
  return null;
}

export function aspirinDevApiPlugin(): Plugin {
  return {
    name: 'aspirin-dev-api-plugin',
    configureServer(server: ViteDevServer) {
      const rootDir = server.config.root || process.cwd();

      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // Only intercept /api/* routes
        if (!url.startsWith('/api/')) {
          return next();
        }

        // Add standard CORS headers for development
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        // 1. Health check
        if (url === '/api/health') {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              status: 'ok',
              mode: 'cloud-native',
              backend: 'sharepoint-azure-cdn',
              onedrive: true,
            })
          );
          return;
        }

        // 2. Stream routes: /api/stream/:chatId/:messageId or /api/notes/:chatId/:messageId
        const streamMatch = url.match(/^\/api\/(stream|notes)\/(-?\d+)\/(\d+)/);
        if (streamMatch) {
          const type = streamMatch[1]; // 'stream' or 'notes'
          const chatId = streamMatch[2];
          const messageId = streamMatch[3];
          const itemKey = `px_${chatId}_${messageId}`;

          const manifest = getManifest(rootDir);
          const manifestItem = manifest[itemKey];

          // Check if item is migrated to OneDrive / SharePoint
          if (manifestItem && manifestItem.onedrive_item_id && manifestItem.status === 'completed') {
            const directUrl = await getOneDriveDownloadUrl(rootDir, manifestItem.onedrive_item_id);
            if (directUrl) {
              const rangeHeader = req.headers['range'];
              const upstreamHeaders: Record<string, string> = {};
              if (rangeHeader) {
                upstreamHeaders['Range'] = Array.isArray(rangeHeader) ? rangeHeader[0] : rangeHeader;
              }

              try {
                const upstreamRes = await fetch(directUrl, { headers: upstreamHeaders });
                res.statusCode = upstreamRes.status;

                // Strip Content-Disposition: attachment so browser plays inline
                res.setHeader(
                  'Content-Type',
                  upstreamRes.headers.get('content-type') || (type === 'notes' ? 'application/pdf' : 'video/mp4')
                );
                res.setHeader('Accept-Ranges', 'bytes');
                const contentRange = upstreamRes.headers.get('content-range');
                if (contentRange) {
                  res.setHeader('Content-Range', contentRange);
                }
                const contentLength = upstreamRes.headers.get('content-length');
                if (contentLength) {
                  res.setHeader('Content-Length', contentLength);
                }
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Headers', 'Range');
                res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
                res.setHeader('Cache-Control', 'public, max-age=3600');

                if (upstreamRes.body) {
                  const { Readable } = await import('stream');
                  // @ts-ignore
                  Readable.fromWeb(upstreamRes.body).pipe(res);
                  return;
                }
              } catch (streamErr) {
                console.error('[Aspirin Dev API] Stream proxy error:', streamErr);
              }
            }
          }

          // If not migrated yet
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: `This ${type === 'notes' ? 'clinical note' : 'lecture'} is currently queued for cloud migration to SharePoint.`,
              status: 'pending_migration',
              chat_id: chatId,
              message_id: messageId,
            })
          );
          return;
        }

        // 3. Thumbnail route: /api/thumbnail/:chatId/:messageId
        const thumbMatch = url.match(/^\/api\/thumbnail\/(-?\d+)\/(\d+)/);
        if (thumbMatch) {
          const chatId = thumbMatch[1];
          const messageId = thumbMatch[2];
          const itemKey = `px_${chatId}_${messageId}`;

          const manifest = getManifest(rootDir);
          const manifestItem = manifest[itemKey];

          if (manifestItem && manifestItem.onedrive_item_id && manifestItem.status === 'completed') {
            const directUrl = await getOneDriveThumbnailUrl(rootDir, manifestItem.onedrive_item_id);
            if (directUrl) {
              res.writeHead(302, {
                Location: directUrl,
                'Cache-Control': 'public, max-age=7200',
                'Access-Control-Allow-Origin': '*',
              });
              res.end();
              return;
            }
          }

          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: 'Thumbnail unavailable or lecture pending cloud migration.',
              status: 'pending_migration',
              chat_id: chatId,
              message_id: messageId,
            })
          );
          return;
        }

        // 4. Mock endpoints for dev mode (Heartbeat, Progress)
        if (url === '/api/progress' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, localDev: true, processed: 1 }));
          return;
        }

        if (url.startsWith('/api/device/')) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, allowed: true, localDev: true }));
          return;
        }

        return next();
      });
    },
  };
}
