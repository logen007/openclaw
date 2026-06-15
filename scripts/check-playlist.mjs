#!/usr/bin/env node
// Check YouTube playlist against Google Sheet database
// Uses YouTube Data API v3 to get ALL items (including deleted/private)
import { readFileSync, writeFileSync } from 'fs';
import { readSheet } from './sheets-jwt.mjs';

const PLAYLIST_ID = 'PLV4DMTjPQbc3bUMh0hel3zqogU9Vb-Kt7';
const SHEET_ID = '1QSJHCx1MLOBIjHDhCqeIukYmj5AtDGOvaizrnKLCtog';
const SHEET_TAB = 'PlayList';
const API_KEY_FILE = '/home/openclaw/.openclaw/credentials/youtube-api-key.txt';

const IS_JSON = process.argv.includes('--json');

if (!IS_JSON) console.log('📥 Fetching YouTube playlist via Data API...');

const API_KEY = readFileSync(API_KEY_FILE, 'utf8').trim();

// ── 1. Fetch all playlist items from YouTube Data API ────────
async function fetchAllPlaylistItems() {
  let items = [];
  let pageToken = '';
  let retries = 0;
  
  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems` +
      `?part=snippet,status` +
      `&playlistId=${PLAYLIST_ID}` +
      `&maxResults=50` +
      `&key=${API_KEY}` +
      (pageToken ? `&pageToken=${pageToken}` : '');
    
    try {
      const resp = await fetch(url);
      const data = await resp.json();
      
      if (data.error) {
        if (data.error.code === 403 && retries < 3) {
          retries++;
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        throw new Error(`API error: ${data.error.message} (${data.error.code})`);
      }
      
      items = items.concat(data.items || []);
      pageToken = data.nextPageToken || '';
      retries = 0; // reset on success
    } catch (e) {
      if (retries < 3) { retries++; await new Promise(r => setTimeout(r, 2000)); continue; }
      throw e;
    }
  } while (pageToken);
  
  return items;
}

const rawItems = await fetchAllPlaylistItems();

// Parse into clean entries
const playlistEntries = rawItems.map(item => {
  const snippet = item.snippet || {};
  const status = item.status || {};
  const videoId = snippet.resourceId ? snippet.resourceId.videoId : '';
  const title = snippet.title || '';
  const privacy = status.privacyStatus || 'unknown';
  const isAvailable = privacy === 'public' || privacy === 'unlisted';
  
  return {
    title: isAvailable ? (title === 'Deleted video' ? '' : title) : '',
    id: videoId || '',
    position: snippet.position !== undefined ? snippet.position + 1 : 0,
    available: isAvailable && title !== 'Deleted video' && !!title,
    privacy,
  };
});

const totalItems = rawItems.length;
const availableItems = playlistEntries.filter(e => e.available);

if (!IS_JSON) {
  console.log(`  → Tổng: ${totalItems} | Available: ${availableItems.length} | Unavailable: ${totalItems - availableItems.length}`);
}

// ── 2. Read songs from Google Sheet ────────────────────────────
if (!IS_JSON) console.log('📄 Đọc Google Sheet...');
let sheetSongs;
try {
  const data = await readSheet(SHEET_ID, `${SHEET_TAB}!A2:A`, false);
  sheetSongs = data.values
    ? data.values.map(row => (row[0] || '').trim()).filter(Boolean)
    : [];
} catch (e) {
  console.error('❌ Lỗi đọc sheet:', e.message);
  process.exit(1);
}
if (!IS_JSON) console.log(`  → ${sheetSongs.length} bài trong sheet`);

// ── 3. Normalize ──────────────────────────────────────────────
function normalize(raw) {
  if (!raw) return '';
  let t = raw
    .replace(/\[.*?\]/g, ' ')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[|♪♬♩🎤►「」【】《》▶▶]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const parts = t.split(/[-–]/);
  let result = (parts[0] || t).trim()
    .replace(/\[\s*\]/g, '')
    .replace(/\s+(karaoke|karoake|beat|tone nam|hạ tone)\s*/gi, ' ')
    .replace(/\s+(official|lyrics|instrumental|full)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s*vietnamese\s*/i, '')
    .replace(/\s*subtitle\s*/i, '')
    .trim();
  if (!result && parts.length > 1) {
    result = parts.slice(1).join(' ').trim()
      .replace(/\[\s*\]/g, '')
      .replace(/\s+(karaoke|karoake|beat|tone nam|hạ tone)\s*/gi, ' ')
      .replace(/\s+(official|lyrics|instrumental|full)\s*/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/hạ tone|tone nam|tone|beat|karaoke|karoake/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return result;
}

// ── 4. Match available entries vs sheet ───────────────────────
const missingFromList = [];   // in playlist, NOT in sheet
const foundInList = [];       // in playlist AND in sheet

for (const entry of availableItems) {
  const norm = normalize(entry.title);
  if (!norm) { foundInList.push(entry); continue; }
  const matched = sheetSongs.some(s => {
    const sNorm = normalize(s);
    if (!sNorm) return false;
    if (sNorm === norm) return true;
    if (sNorm.length >= 5 && norm.length >= 5) {
      if (sNorm.includes(norm) || norm.includes(sNorm)) return true;
      const core = norm.slice(0, 12);
      if (core.length >= 6 && sNorm.includes(core)) return true;
    }
    return false;
  });
  if (matched) foundInList.push(entry);
  else missingFromList.push(entry);
}

// ── 5. Check sheet songs missing from playlist ─────────────────
const missingFromPlaylist = [];
for (const song of sheetSongs) {
  const norm = normalize(song);
  if (!norm) continue;
  const matched = availableItems.some(e => {
    const eNorm = normalize(e.title);
    if (!eNorm) return false;
    return eNorm.includes(norm) || norm.includes(eNorm);
  });
  if (!matched) missingFromPlaylist.push(song);
}

// ── 6. Output ──────────────────────────────────────────────────
if (IS_JSON) {
  console.log(JSON.stringify({
    total: totalItems,
    available: availableItems.length,
    unavailable: totalItems - availableItems.length,
    matched: foundInList.length,
    new_count: missingFromList.length,
    missing_count: missingFromPlaylist.length,
    new_songs: missingFromList.map(e => ({ title: e.title, id: e.id, position: e.position })),
    missing_songs: missingFromPlaylist.map(name => ({ name })),
  }));
} else {
  console.log(`\n✅ Đã match: ${foundInList.length}/${availableItems.length} khả dụng`);
  console.log(`🆕 Chưa có trong sheet: ${missingFromList.length}`);
  console.log(`❌ Mất trên playlist: ${missingFromPlaylist.length}`);
  console.log(`🔇 Unavailable (deleted/private): ${totalItems - availableItems.length}`);
  if (missingFromList.length) {
    console.log('\n📦 Bài mới (chưa có trong sheet):');
    missingFromList.forEach(e => console.log(`  • #${e.position} ${e.title}`));
  }
  if (missingFromPlaylist.length) {
    console.log('\n⚠️ Bài trong sheet nhưng mất trên playlist:');
    missingFromPlaylist.slice(0, 10).forEach(s => console.log(`  • ${s}`));
    if (missingFromPlaylist.length > 10) console.log(`  ... và ${missingFromPlaylist.length - 10} bài nữa`);
  }
}
