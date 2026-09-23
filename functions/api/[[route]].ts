import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';

type Bindings = {
  DB?: D1Database;
  STREAM_ORIGIN?: string;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// Enable CORS for all routes
app.use('*', cors());

// Helper to get stream origin
const getStreamOrigin = (env: Bindings) => env.STREAM_ORIGIN || 'http://127.0.0.1:8787';

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

// 4. GET /api/stream/:chatId/:messageId - Edge stream router with Range forwarding
app.get('/stream/:chatId/:messageId', async (c) => {
  const { chatId, messageId } = c.req.param();
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
        hint: "Ensure 'python engine/stream_bridge.py' is running or STREAM_ORIGIN is set.",
      },
      502
    );
  }
});

// 5. GET /api/notes/:chatId/:messageId - Notes & PDF streaming
app.get('/notes/:chatId/:messageId', async (c) => {
  const { chatId, messageId } = c.req.param();
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
