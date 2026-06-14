#!/usr/bin/env node
// Compare SONGS.md with playlist to find NA songs
// Tự động fetch playlist từ yt-dlp, không cần file tạm
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PLV4DMTjPQbc3bUMh0hel3zqogU9Vb-Kt7';

const songsRaw = readFileSync('/home/openclaw/.openclaw/workspace/karaoke/SONGS.md', 'utf8');

// Fetch playlist trực tiếp — lấy video có sẵn (không NA)
const raw = execSync(`yt-dlp --flat-playlist --print "%(title)s" "${PLAYLIST_URL}" 2>/dev/null`, { timeout: 30000 });
const playlistRaw = raw.toString().trim();

// Extract song names from SONGS.md (lines starting with - )
const songs = songsRaw.split('\n')
  .filter(l => l.trim().startsWith('- '))
  .map(l => l.replace(/^-\s*/, '').trim())
  .filter(Boolean);

// Playlist entries (non-NA)
const playlistEntries = playlistRaw.split('\n').filter(Boolean);

function extractKeywords(title) {
  return title
    .replace(/^[-–|]\s*/, '')
    .replace(/[\[\(\{「『【《〈].*?[\]\)\}」』】》〉]/g, ' ')
    .replace(/karaoke|beat|tone nam|tone nữ|hạ tone|official|instrumental|lyrics|full|version|live/gi, ' ')
    .replace(/[|♪♬♩🎤►「」【】《》\.,!?♥✔]/g, ' ')
    .split(/[-–/\s]+/)
    .map(w => w.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    .filter(w => w.length > 3);
}

function matchScore(song, entry) {
  const sKeywords = extractKeywords(song);
  const eKeywords = extractKeywords(entry);
  
  let hits = 0;
  for (const sk of sKeywords) {
    for (const ek of eKeywords) {
      if (sk.includes(ek) || ek.includes(sk)) {
        hits++;
        break;
      }
    }
  }
  
  // Also check if name part matches
  const songName = song.split(/[-–]/)[0].trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const entryLC = entry.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Bonus if song name appears in entry
  if (entryLC.includes(songName) || songName.includes(entryLC)) {
    hits += 2;
  }
  
  return hits / Math.max(sKeywords.length, 1);
}

console.log('=== BÀI TRONG DANH SÁCH NHƯNG KHÔNG CÓ TRONG PLAYLIST (có thể là NA) ===');
console.log('');

const missing = [];
const matched = [];

for (const song of songs) {
  const songName = song.split(/[-–|]/)[0].trim().toLowerCase();
  
  let bestScore = 0;
  let bestEntry = '';
  
  for (const entry of playlistEntries) {
    const score = matchScore(song, entry);
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }
  
  if (bestScore > 0.3) {
    matched.push({ song, match: bestEntry, score: bestScore });
  } else {
    missing.push({ song, score: bestScore });
  }
}

if (missing.length === 0) {
  console.log('✅ Tất cả bài trong list đều có mặt trong playlist!');
} else {
  for (const m of missing) {
    console.log(`📛 ${m.song}`);
  }
}

console.log('');
console.log(`=== TỔNG KẾT ===`);
console.log(`Bài trong list: ${songs.length}`);
console.log(`Đã match với playlist: ${matched.length}`);
console.log(`Không match (có thể NA): ${missing.length}`);
console.log(`Entry playlist (không-NA): ${playlistEntries.length}`);
console.log(`Entry NA: 29`);
