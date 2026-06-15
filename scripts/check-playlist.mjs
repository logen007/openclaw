#!/usr/bin/env node
// Check YouTube playlist against Google Sheet database
import { execSync } from 'child_process';
import { readSheet } from './sheets-jwt.mjs';

const PLAYLIST = 'https://www.youtube.com/playlist?list=PLV4DMTjPQbc3bUMh0hel3zqogU9Vb-Kt7';
const SHEET_ID = '1QSJHCx1MLOBIjHDhCqeIukYmj5AtDGOvaizrnKLCtog';
const TAB = 'PlayList';

const IS_JSON = process.argv.includes('--json');

// ── 1. Fetch YouTube playlist ──────────────────────────────────
if (!IS_JSON) console.log('📥 Fetching YouTube playlist...');
const raw = execSync(
  `yt-dlp --flat-playlist --dump-json "${PLAYLIST}" 2>/dev/null`,
  { timeout: 30000 }
);
const playlistEntries = raw.toString().trim().split('\n').filter(Boolean).map(line => {
  try {
    const d = JSON.parse(line);
    return { title: (d.title || '').trim(), id: (d.id || '').trim() };
  } catch { return { title: '', id: '' }; }
}).filter(e => e.title); // only non-empty titles

if (!IS_JSON) console.log(`  → ${playlistEntries.length} bài khả dụng (trên tổng ~231)`);

// ── 2. Read songs from Google Sheet ────────────────────────────
if (!IS_JSON) console.log('📄 Đọc Google Sheet...');
let sheetSongs;
try {
  const data = await readSheet(SHEET_ID, `${TAB}!A2:A`, false);
  sheetSongs = data.values
    ? data.values.map(row => (row[0] || '').trim()).filter(Boolean)
    : [];
} catch (e) {
  console.error('❌ Lỗi đọc sheet:', e.message);
  process.exit(1);
}
if (!IS_JSON) console.log(`  → ${sheetSongs.length} bài trong sheet`);

// ── 3. Normalize function ──────────────────────────────────────
function normalize(raw) {
  let t = raw
    .replace(/\[.*?\]/g, ' ')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[|♪♬♩🎤►「」【】《》▶▶]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  // Take first meaningful part (before - or –)
  const parts = t.split(/[-–]/);
  let result = (parts[0] || t).trim()
    .replace(/\[\s*\]/g, '')
    .replace(/\s+(karaoke|karoake|beat|tone nam|hạ tone|official|lyrics|instrumental|full)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s*vietnamese\s*/i, '')
    .replace(/\s*subtitle\s*/i, '')
    .trim();
  // If first part is empty after cleanup, try the second part
  if (!result && parts.length > 1) {
    result = parts.slice(1).join(' ').trim()
      .replace(/\[\s*\]/g, '')
      .replace(/\s+(karaoke|karoake|beat|tone nam|hạ tone|official|lyrics|instrumental|full)\s*/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/hạ tone|tone nam|tone|beat|karaoke|karoake/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return result;
}

// ── 4. Match playlist entries vs sheet songs ───────────────────
const missingFromList = [];   // in playlist, NOT in sheet
const foundInList = [];       // in playlist AND in sheet

for (const entry of playlistEntries) {
  const norm = normalize(entry.title);
  if (!norm) { foundInList.push(entry); continue; }
  const matched = sheetSongs.some(s => {
    const sNorm = normalize(s);
    if (!sNorm) return false;
    // Exact match │ one contains the other (meaningful length)
    if (sNorm === norm) return true;
    if (sNorm.length >= 5 && norm.length >= 5) {
      if (sNorm.includes(norm) || norm.includes(sNorm)) return true;
      // Core first-10-char match
      const core = norm.slice(0, 10);
      if (core.length >= 5 && sNorm.includes(core)) return true;
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
  const matched = playlistEntries.some(e => {
    const eNorm = normalize(e.title);
    if (!eNorm) return false;
    return eNorm.includes(norm) || norm.includes(eNorm);
  });
  if (!matched) missingFromPlaylist.push(song);
}

// ── 6. Output ──────────────────────────────────────────────────
if (IS_JSON) {
  console.log(JSON.stringify({
    total: playlistEntries.length,
    matched: foundInList.length,
    new_count: missingFromList.length,
    missing_count: missingFromPlaylist.length,
    new_songs: missingFromList.map(e => ({ title: e.title, id: e.id })),
    missing_songs: missingFromPlaylist.map(name => ({ name })),
  }));
} else {
  console.log(`\n✅ Đã match: ${foundInList.length}/${playlistEntries.length}`);
  console.log(`🆕 Chưa có trong Google Sheet: ${missingFromList.length}`);
  console.log(`❌ Mất trên playlist: ${missingFromPlaylist.length}`);
  if (missingFromList.length) {
    console.log('\n📦 Bài mới (chưa có trong sheet):');
    missingFromList.forEach(e => console.log(`  • ${e.title}`));
  }
  if (missingFromPlaylist.length) {
    console.log('\n⚠️ Bài có trong sheet nhưng mất trên playlist:');
    missingFromPlaylist.forEach(s => console.log(`  • ${s}`));
  }
}
