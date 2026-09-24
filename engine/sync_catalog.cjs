const fs = require('fs');
const path = require('path');

const ACRONYMS = new Set([
  'ENT', 'OBG', 'PSM', 'FMT', 'EEG', 'ICP', 'ALS', 'MND', 'SAH', 'TIA',
  'SLE', 'RA', 'PBC', 'PSC', 'COPD', 'TB', 'ILD', 'PAP', 'LBW', 'CT',
  'MRI', 'USG', 'PROM', 'IUGR', 'PCOS', 'PID', 'CIN', 'ATLS', 'IV', 'GI',
  'NEET', 'PG', 'COVID', 'HIV', 'DNA', 'RNA', 'CSF', 'RBC', 'WBC', 'HB',
  'ABG', 'ECG', 'LFT', 'KFT', 'RFT', 'P1', 'P2', 'P3', 'P4'
]);

const MINOR_WORDS = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'of', 'in', 'with']);

function toTitleCase(s) {
  const tokens = s.split(/(\s+|[-/(),])/);
  let wordIdx = 0;
  return tokens.map((tok) => {
    if (!tok || /^(\s+|[-/(),])$/.test(tok)) return tok;
    const cleaned = tok.replace(/[^\w]/g, '').toUpperCase();
    if (ACRONYMS.has(cleaned)) {
      wordIdx++;
      return cleaned;
    }
    if (wordIdx > 0 && MINOR_WORDS.has(tok.toLowerCase())) {
      wordIdx++;
      return tok.toLowerCase();
    }
    wordIdx++;
    return tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase();
  }).join('');
}

function formatLectureTitle(rawTitle, subjectName, subjectId) {
  let t = (rawTitle || '').trim().replace(/\.(mp4|mkv|webm|pdf)$/i, '').trim();
  t = t.replace(/\bsurgey\b/gi, 'Surgery')
       .replace(/\bnutition\b/gi, 'Nutrition')
       .replace(/\bdsz\b/gi, 'Disease')
       .replace(/\bpappulo\b/gi, 'Papulo')
       .replace(/\bbasi\b/gi, 'Basics')
       .replace(/\bint obstruction\b/gi, 'Intestinal Obstruction')
       .replace(/\buppergi\b/gi, 'Upper GI')
       .replace(/\bthyriod\b/gi, 'Thyroid')
       .replace(/\bmedistanum\b/gi, 'Mediastinum')
       .replace(/\bamnitic\b/gi, 'Amniotic')
       .replace(/\bderma\b|\bdermat\b/gi, 'Dermatology')
       .replace(/\bortho\b/gi, 'Orthopedics')
       .replace(/\bed6\b|\bedition\s*0?6\b/gi, 'Edition 6')
       .replace(/\s+/g, ' ')
       .trim();

  const m = t.match(/^(?:lecture\s*)?0*(\d+)[\.\s\-_:]*(.*)$/i);
  if (m) {
    const num = parseInt(m[1], 10);
    if (num > 500) return toTitleCase(t);
    let rest = m[2].trim();
    if (!rest) {
      rest = subjectName ? `${subjectName} Part ${num}` : `Part ${num}`;
    }
    return `${num}. ${toTitleCase(rest)}`;
  }
  return toTitleCase(t);
}

async function syncCatalog() {
  const rootDir = path.resolve(__dirname, '..');
  const tokenFile = path.resolve(rootDir, 'onedrive_token.json');

  // Support both local (token file) and CI (env vars) environments
  let accessToken = '';
  let refreshToken = '';
  const clientId = process.env.ONEDRIVE_CLIENT_ID || 'ba92c830-fac7-4d60-a0ff-8bf0b581a4c4';
  const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET || '';
  const tenantId = process.env.ONEDRIVE_TENANT_ID || '938a1924-0af0-4599-819b-177a1dcf8fd6';

  if (fs.existsSync(tokenFile)) {
    const raw = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
    accessToken = raw.access_token || '';
    refreshToken = raw.refresh_token || '';
  } else if (process.env.ONEDRIVE_REFRESH_TOKEN) {
    refreshToken = process.env.ONEDRIVE_REFRESH_TOKEN;
    console.log('Using ONEDRIVE_REFRESH_TOKEN from environment (CI mode).');
  } else {
    console.warn('No token file or ONEDRIVE_REFRESH_TOKEN found. Skipping Graph API metadata fetch.');
  }

  // 1. Refresh Microsoft Graph token if needed
  if (refreshToken) {
    try {
      const body = {
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      };
      if (clientSecret) body.client_secret = clientSecret;

      const refreshRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(body),
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        accessToken = data.access_token;
        // Save updated tokens back to local file if it exists
        if (fs.existsSync(tokenFile)) {
          const raw = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
          raw.access_token = data.access_token;
          if (data.refresh_token) raw.refresh_token = data.refresh_token;
          fs.writeFileSync(tokenFile, JSON.stringify(raw, null, 2));
        }
      }
    } catch (err) {
      console.warn('Token refresh warning:', err.message);
    }
  }

  // 2. Read manifest
  const manifestPath = path.resolve(rootDir, 'engine/transfer_manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const completed = Object.entries(manifest).filter(
    ([k, v]) => v.status === 'completed' && v.onedrive_item_id && !v.skipped
  );
  console.log(`Found ${completed.length} completed media items in manifest.`);

  // 3. Fetch missing duration metadata from Microsoft Graph
  const pendingMeta = completed.filter(([k, v]) => !v.duration_seconds || v.duration_seconds === 0);
  if (pendingMeta.length > 0) {
    console.log(`Fetching metadata for ${pendingMeta.length} items from Microsoft Graph...`);
    const chunk = 5;
    for (let i = 0; i < pendingMeta.length; i += chunk) {
      const slice = pendingMeta.slice(i, i + chunk);
      await Promise.all(
        slice.map(async ([key, item]) => {
          try {
            const res = await fetch(
              `https://graph.microsoft.com/v1.0/sites/root/drive/items/${item.onedrive_item_id}?$select=id,name,video,size`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (!res.ok) return;
            const data = await res.json();
            if (data.video && data.video.duration) {
              const sec = Math.round(data.video.duration / 1000);
              const m = Math.floor(sec / 60);
              const s = sec % 60;
              const formatted = m > 60
                ? `${Math.floor(m / 60)}h ${m % 60}m`
                : `${m}m ${s > 0 ? s + 's' : ''}`.trim();

              item.duration_seconds = sec;
              item.duration_formatted = formatted;
              if (data.video.width && data.video.height) {
                item.resolution = `${data.video.width}x${data.video.height}`;
              }
            }
          } catch (e) {
            console.error(`Error fetching meta for ${item.filename}:`, e.message);
          }
        })
      );
    }
    // Save updated manifest
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    const publicManifestPath = path.resolve(rootDir, 'public/transfer_manifest.json');
    fs.writeFileSync(publicManifestPath, JSON.stringify(manifest, null, 2));
  }

  // 4. Update public/catalog.json
  const catalogPath = path.resolve(rootDir, 'public/catalog.json');
  if (!fs.existsSync(catalogPath)) {
    console.error('catalog.json not found!');
    return;
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  // Subject lookup
  const subjectMap = new Map();
  for (const sub of catalog.subjects || []) {
    // Ensure FMT is 3rd Prof Part 1
    if (sub.id === 'forensic_medicine') {
      sub.prof = '3rd Prof Part 1';
    }
    // Ensure ENT and Ophthalmology are Final Prof Part 2
    if (sub.id === 'ent' || sub.id === 'ophthalmology') {
      sub.prof = 'Final Prof Part 2';
    }
    subjectMap.set(sub.id, sub);
  }

  // Map manifest items to topics in catalog
  for (const [key, item] of completed) {
    if (item.type === 'separator' || item.type === 'non_video_skipped') continue;

    let subId = item.subject_id;
    if (subId === 'obg') subId = 'obgyn';
    if (subId === 'anesthesia') subId = 'anesthesiology';

    const sub = subjectMap.get(subId);
    if (!sub) continue;

    // Determine platform and module name
    const platform = item.platform || (key.startsWith('mr_') ? 'marrow' : 'prepx_en');
    
    if (!sub.modules) sub.modules = [];
    let mod = null;

    if (platform === 'marrow') {
      mod = sub.modules.find((m) => m.id === `mod_marrow_${subId}` || m.name.includes('Marrow'));
      if (!mod) {
        mod = {
          id: `mod_marrow_${subId}`,
          name: `Marrow Edition 6 - ${sub.name}`,
          topics: [],
        };
        sub.modules.push(mod);
      }
    } else if (platform === 'cerebellum') {
      mod = sub.modules.find((m) => m.id === `mod_cerebellum_${subId}` || m.name.includes('Cerebellum'));
      if (!mod) {
        mod = {
          id: `mod_cerebellum_${subId}`,
          name: `Cerebellum Academy - ${sub.name}`,
          topics: [],
        };
        sub.modules.push(mod);
      }
    } else if (platform === 'prepx_hi') {
      mod = sub.modules.find((m) => m.id === `mod_prepx_hi_${subId}` || m.name.includes('Hinglish'));
      if (!mod) {
        mod = {
          id: `mod_prepx_hi_${subId}`,
          name: `PrepLadder Edition X (Hinglish) - ${sub.name}`,
          topics: [],
        };
        sub.modules.push(mod);
      }
    } else {
      // PrepLadder English (prepx_en)
      if (subId === 'medicine') {
        mod = sub.modules.find((m) => m.id === 'mod_med_full') || sub.modules[0];
      } else if (subId === 'anatomy') {
        mod = sub.modules.find((m) => m.id === 'mod_anat_neuro') || sub.modules[0];
      } else {
        mod = sub.modules.find((m) => m.id === `mod_prepx_en_${subId}` || (m.name.includes('PrepLadder') && !m.name.includes('Hinglish')));
      }

      if (!mod) {
        mod = {
          id: `mod_prepx_en_${subId}`,
          name: `PrepLadder Edition X - ${sub.name}`,
          topics: [],
        };
        sub.modules.push(mod);
      }
    }

    // Extract chatId and msgId reliably from item or key
    const parts = key.split('_');
    const chatId = item.telegram_chat_id || item.chat_id || (parts.length >= 3 ? parseInt(parts[1], 10) : -1003709841202);
    const msgId = item.telegram_message_id || item.message_id || (parts.length >= 3 ? parseInt(parts[2], 10) : 0);
    const topicId = `topic_${chatId}_${msgId}`;
    let topic = mod.topics.find((t) => t.id === topicId);

    const rawTitle = item.clean_title || item.title || (item.filename ? item.filename.replace(/\.(mp4|mkv|webm|pdf)$/i, '') : `Lecture ${msgId}`);
    const title = formatLectureTitle(rawTitle, sub ? sub.name : '', subId);
    const sizeBytes = item.size_bytes || item.file_size || 0;
    const sizeMb = Math.round((sizeBytes / (1024 * 1024)) * 100) / 100;

    if (!topic) {
      topic = {
        id: topicId,
        subject_id: subId,
        module: mod.name,
        title: title,
        filename: item.filename || `${title}.mp4`,
        file_size_bytes: sizeBytes,
        file_size_mb: sizeMb,
        duration_seconds: item.duration_seconds || 0,
        duration_formatted: item.duration_formatted || '0m',
        chat_id: chatId,
        message_id: msgId,
        pearls: [
          `Key clinical concepts and high-yield examination pearls in ${title}`,
          `Essential clinical reasoning, diagnostic criteria and management guidelines`
        ],
        date: item.uploaded_at || item.completed_at || new Date().toISOString(),
        thumbnail_url: `/api/thumbnail/${chatId}/${msgId}`,
      };
      mod.topics.push(topic);
    } else {
      topic.title = title;
      topic.filename = item.filename || topic.filename;
      if (item.duration_seconds) topic.duration_seconds = item.duration_seconds;
      if (item.duration_formatted) topic.duration_formatted = item.duration_formatted;
      topic.thumbnail_url = `/api/thumbnail/${chatId}/${msgId}`;
    }

    // Always keep module topics sorted in exact numerical sequence
    mod.topics.sort((a, b) => {
      const mA = (a.title || '').match(/^0*(\d+)\b/);
      const mB = (b.title || '').match(/^0*(\d+)\b/);
      const nA = mA ? parseInt(mA[1], 10) : 999999;
      const nB = mB ? parseInt(mB[1], 10) : 999999;
      return nA - nB;
    });
  }

  // Deduplicate topics and remove empty modules
  for (const sub of catalog.subjects || []) {
    const seenTopicIds = new Set();
    for (const mod of sub.modules || []) {
      mod.topics = mod.topics.filter((t) => {
        if (!t.id || t.id.includes('undefined')) return false;
        if (seenTopicIds.has(t.id)) return false;
        seenTopicIds.add(t.id);
        return true;
      });
    }
    sub.modules = (sub.modules || []).filter((m) => m.topics && m.topics.length > 0);
  }

  // Sort each module's topics by numerical sequence
  for (const sub of catalog.subjects || []) {
    let totalTopics = 0;
    for (const mod of sub.modules || []) {
      mod.topics.sort((a, b) => {
        const matchA = (a.title || '').match(/^0*(\d+)\b/);
        const matchB = (b.title || '').match(/^0*(\d+)\b/);
        const numA = matchA ? parseInt(matchA[1], 10) : (a.message_id || 999999);
        const numB = matchB ? parseInt(matchB[1], 10) : (b.message_id || 999999);
        return numA - numB;
      });
      totalTopics += mod.topics.length;
    }
    sub.total_topics = totalTopics;
  }

  catalog.updated_at = new Date().toISOString();
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
  console.log(`\nCatalog successfully synced and written to ${catalogPath}!`);
  for (const s of catalog.subjects || []) {
    if (s.total_topics > 0) {
      console.log(` - ${s.name}: ${s.total_topics} topics across ${s.modules.length} module(s) [${s.prof}]`);
    }
  }
}

if (require.main === module) {
  syncCatalog().catch(console.error);
}

module.exports = { syncCatalog };
