#!/usr/bin/env node
// Check YouTube playlist against saved song list
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const PLAYLIST = 'https://www.youtube.com/playlist?list=PLV4DMTjPQbc3bUMh0hel3zqogU9Vb-Kt7';
const SONGS_FILE = '/home/openclaw/.openclaw/workspace/karaoke/SONGS.md';

// Fetch playlist titles
console.log('📥 Fetching playlist...');
const raw = execSync(`yt-dlp --flat-playlist --print "%(title)s|%(id)s" "${PLAYLIST}" 2>/dev/null`, { timeout: 30000 });
const playlistEntries = raw.toString().trim().split('\n').filter(Boolean).map(line => {
  const [title, id] = line.split('|');
  return { title: title ? title.trim() : '', id: id ? id.trim() : '' };
});

console.log(`📋 Playlist: ${playlistEntries.length} videos`);

// Read current songs
const songsContent = readFileSync(SONGS_FILE, 'utf8');
const songsLines = songsContent.split('\n');

// Extract song names from SONGS.md (lines starting with - )
const savedSongs = songsLines
  .filter(l => l.trim().startsWith('- '))
  .map(l => l.replace(/^-\s*/, '').trim().toLowerCase());

// Extract just the song name part (before the dash or pipe)
function normalizeSongTitle(rawTitle) {
  let t = rawTitle
    .replace(/^\[.*?\]\s*/, '')         // [KARAOKE], [BEAT], etc
    .replace(/[-–]\s*(KARAOKE|Beat|Official|Karaoke|Lyrics|Instrumental).*/i, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[|♪♬♩🎤►「」【】《》]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  // Take first meaningful part
  const parts = t.split(/[-–]/);
  return (parts[0] || t).trim().replace(/karoake|karaoke|beat|tone nam|hạ tone/gi, '').trim();
}

// Check for new videos not in saved songs
const missingFromList = [];
const foundInList = [];

for (const entry of playlistEntries) {
  const normalized = normalizeSongTitle(entry.title);
  const matched = savedSongs.some(s => {
    // Check if any significant part of the song title matches
    const songParts = s.split(/[-–|]/).map(p => p.trim().toLowerCase());
    return songParts.some(part => {
      if (part.length < 5) return false;
      return normalized.includes(part) || part.includes(normalized);
    });
  });
  
  if (!matched) {
    missingFromList.push(entry);
  } else {
    foundInList.push(entry);
  }
}

// Check for saved songs missing from playlist (may be copyright takedowns)
const missingFromPlaylist = [];
for (const song of savedSongs) {
  const normalized = normalizeSongTitle(song);
  const matched = playlistEntries.some(e => {
    const eNorm = normalizeSongTitle(e.title);
    return eNorm.includes(normalized) || normalized.includes(eNorm);
  });
  if (!matched) {
    missingFromPlaylist.push(song);
  }
}

console.log(`\n✅ Đã match: ${foundInList.length}/${playlistEntries.length}`);
console.log(`🆕 Có thể là bài mới: ${missingFromList.length}`);
console.log(`❌ Có thể bị mất: ${missingFromPlaylist.length}`);

if (missingFromList.length > 0) {
  console.log('\n🆕 BÀI MỚI (có thể thêm vào):');
  for (const e of missingFromList) {
    console.log(`  • ${e.title}`);
  }
}

if (missingFromPlaylist.length > 0) {
  console.log('\n⚠️ BÀI CÓ THỂ BỊ MẤT TRÊN PLAYLIST:');
  for (const s of missingFromPlaylist) {
    // Find it in saved songs
    const origLine = songsLines.find(l => l.trim().startsWith('- ') && l.toLowerCase().includes(s.substring(0, 10)));
    console.log(`  • ${origLine ? origLine.replace(/^-\s*/, '') : s}`);
  }
  console.log('\n📢 Hãy báo anh để thêm lại!');
}
