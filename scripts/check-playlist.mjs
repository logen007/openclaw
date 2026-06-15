#!/usr/bin/env node
// KA — Check playlist + auto-update sheet
// --json: output JSON (read-only)
// --update: sync sheet (add new, mark missing)
import { readFileSync } from 'fs';
import { readSheet, getToken } from './sheets-jwt.mjs';

const PLAYLIST_ID = 'PLV4DMTjPQbc3bUMh0hel3zqogU9Vb-Kt7';
const SHEET_ID = '1QSJHCx1MLOBIjHDhCqeIukYmj5AtDGOvaizrnKLCtog';
const TAB = 'PlayList';
const API_KEY_FILE = '/home/openclaw/.openclaw/credentials/youtube-api-key.txt';
const API_KEY = readFileSync(API_KEY_FILE, 'utf8').trim();
const IS_JSON = process.argv.includes('--json');
const DO_UPDATE = process.argv.includes('--update');

// ─────────── 1. YouTube Data API ───────────
async function fetchAllPlaylistItems() {
  let items = [], pageToken = '', retries = 0;
  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems` +
      `?part=snippet,status` +
      `&playlistId=${PLAYLIST_ID}&maxResults=50&key=${API_KEY}` +
      (pageToken ? `&pageToken=${pageToken}` : '');
    try {
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.error) throw new Error(`API error: ${data.error.message}`);
      items = items.concat(data.items || []);
      pageToken = data.nextPageToken || '';
      retries = 0;
    } catch (e) {
      if (++retries >= 3) throw e;
      await new Promise(r => setTimeout(r, 2000));
    }
  } while (pageToken);
  return items;
}

const rawItems = await fetchAllPlaylistItems();
const playlistEntries = rawItems.map(item => {
  const s = item.snippet || {}, st = item.status || {};
  const videoId = s.resourceId ? s.resourceId.videoId : '';
  const title = s.title || '';
  const avail = (st.privacyStatus === 'public' || st.privacyStatus === 'unlisted');
  return {
    title: avail && title !== 'Deleted video' && title ? title : '',
    id: videoId || '',
    position: (s.position ?? 0) + 1,
    available: avail && title !== 'Deleted video' && !!title,
    privacy: st.privacyStatus || 'unknown',
  };
});
const totalItems = rawItems.length;
const availableItems = playlistEntries.filter(e => e.available);

// ─────────── 2. Read sheet ───────────
const sheetData = await readSheet(SHEET_ID, `${TAB}!A:D`, false);
const sheetRows = sheetData.values || [];
// Parse rows: col A=Song, B=Available, C=Note, D=VideoID
// Skip header (row 1)
const songs = [];
for (let i = 1; i < sheetRows.length; i++) {
  const r = sheetRows[i];
  songs.push({
    idx: i + 1,
    name: (r[0] || '').trim(),
    available: (r[1] || '').trim().toUpperCase(),
    note: (r[2] || '').trim(),
    videoId: (r[3] || '').trim(),
  });
}

// ─────────── 3. Normalize ───────────
function normalize(raw) {
  if (!raw) return '';
  let t = raw
    .replace(/\[.*?\]/g, ' ').replace(/\(.*?\)/g, ' ')
    .replace(/[|♪♬♩🎤►「」【】《》▶▶]/g, ' ')
    .replace(/\s+/g, ' ').trim().toLowerCase();
  const parts = t.split(/[-–]/);
  let r = (parts[0] || t).trim()
    .replace(/\[\s*\]/g, '')
    .replace(/\s+(karaoke|karoake|beat|tone nam|hạ tone|official|lyrics|instrumental|full)\s*/gi, ' ')
    .replace(/\s+/g, ' ').trim()
    .replace(/\s*vietnamese\s*/i, '').replace(/\s*subtitle\s*/i, '').trim();
  if (!r && parts.length > 1) {
    r = parts.slice(1).join(' ').trim()
      .replace(/\[\s*\]/g, '').replace(/hạ tone|tone nam|tone|beat|karaoke|karoake/gi, '')
      .replace(/\s+/g, ' ').trim();
  }
  return r;
}
function matches(ytTitle, sheetName) {
  const a = normalize(ytTitle), b = normalize(sheetName);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 5 && b.length >= 5) {
    if (a.includes(b) || b.includes(a)) return true;
    const core = a.slice(0, 12);
    if (core.length >= 6 && b.includes(core)) return true;
  }
  return false;
}

// ─────────── 4. Build song map ───────────
// Create lookup: normalized name → sheet row
const sheetMap = new Map();
for (const s of songs) {
  if (!s.name) continue;
  sheetMap.set(normalize(s.name), s);
}

// ─────────── 5. Classify ───────────
const newSongs = [];      // in YouTube, NOT in sheet
const matchedSongs = [];  // in both
const missingRows = [];   // in sheet, NOT in available playlist

// Check each YouTube entry against sheet
for (const e of availableItems) {
  const norm = normalize(e.title);
  if (!norm) { matchedSongs.push(e); continue; }
  let found = false;
  for (const [key, s] of sheetMap) {
    if (matches(e.title, s.name)) { found = true; break; }
  }
  if (found) matchedSongs.push(e);
  else newSongs.push(e);
}

// Check sheet songs against available playlist
const availableTitles = availableItems.map(e => e.title);
for (const s of songs) {
  if (!s.name) continue;
  const inPlaylist = availableTitles.some(t => matches(t, s.name));
  if (!inPlaylist) missingRows.push(s);
}

// ─────────── 6. UPDATE sheet ───────────
if (DO_UPDATE) {
  if (!IS_JSON) console.log('📝 Đang cập nhật sheet...');
  const token = await getToken(true);
  
  // Build new rows: header + existing (updated) + new songs
  const header = ['Song', 'Available', 'Note', 'Video ID'];
  const updatedRows = [header];
  
  // Process EXISTING sheet rows
  for (const s of songs) {
    if (!s.name) continue;
    const isMissing = missingRows.some(m => m.idx === s.idx);
    if (isMissing) {
      updatedRows.push([s.name, 'NO', 'Video no longer in playlist', s.videoId]);
    } else {
      updatedRows.push([s.name, 'YES', s.note || '', s.videoId]);
    }
  }
  
  // Append NEW songs
  for (const ns of newSongs) {
    updatedRows.push([ns.title, 'YES', 'New - auto added by KA', ns.id]);
  }
  
  // PUT to sheet
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${TAB}!A:D?valueInputOption=USER_ENTERED`;
  const resp = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: updatedRows, majorDimension: 'ROWS' }),
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(`Sheet write error: ${resp.status} ${JSON.stringify(err).slice(0, 200)}`);
  }
  const added = newSongs.length;
  const marked = missingRows.length;
  if (!IS_JSON) console.log(`✅ Sheet updated: +${added} mới, ${marked} đánh dấu NO`);
}

// ─────────── 7. Output ───────────
const output = {
  total: totalItems,
  available: availableItems.length,
  unavailable: totalItems - availableItems.length,
  matched: matchedSongs.length,
  new_count: newSongs.length,
  missing_count: missingRows.length,
  new_songs: newSongs.map(e => ({ title: e.title, id: e.id, position: e.position })),
  missing_songs: missingRows.map(s => ({ name: s.name })),
  ...(DO_UPDATE ? { updated: true } : {}),
};

if (IS_JSON) {
  console.log(JSON.stringify(output));
} else {
  console.log(`\n📋 Tổng: ${totalItems} (${availableItems.length} available, ${totalItems - availableItems.length} deleted/private)`);
  console.log(`✅ Matched: ${matchedSongs.length}`);
  console.log(`🆕 Mới: ${newSongs.length}`);
  console.log(`❌ Mất: ${missingRows.length}`);
  if (DO_UPDATE) console.log(`📝 Sheet đã được cập nhật!`);
  if (newSongs.length) console.log(`\n➜ Thêm ${newSongs.length} bài vào sheet:`, newSongs.map(e => `#${e.position} ${e.title}`).join(', '));
  if (missingRows.length) console.log(`\n➜ ${missingRows.length} bài mất khỏi playlist, đánh dấu NO`);
}
