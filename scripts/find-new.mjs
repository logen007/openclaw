#!/usr/bin/env node
// Chính xác: bài nào trong playlist chưa có trong SONGS.md?
// Tự động fetch playlist từ yt-dlp, không cần file tạm
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PLV4DMTjPQbc3bUMh0hel3zqogU9Vb-Kt7';

const songsMd = readFileSync('/home/openclaw/.openclaw/workspace/karaoke/SONGS.md', 'utf8');

// Fetch playlist trực tiếp
const raw = execSync(`yt-dlp --flat-playlist --print "%(title)s" "${PLAYLIST_URL}" 2>/dev/null`, { timeout: 30000 });
const playlistRaw = raw.toString().trim();

// Tất cả tên bài từ SONGS.md — clean + lowercase + bỏ dấu
const songNames = songsMd.split('\n')
  .filter(l => l.trim().startsWith('- '))
  .map(l => {
    let t = l.replace(/^-\s*/, '').trim();
    // Lấy phần tên bài (trước dấu - hoặc |)
    t = t.split(/[-–|]/)[0].trim().toLowerCase();
    return normalize(t);
  })
  .filter(Boolean);

// Tất cả playlist entries (bỏ NA)
const entries = playlistRaw.split('\n')
  .map(l => l.trim())
  .filter(l => l && l !== 'NA');

function normalize(s) {
  return s
    .replace(/[\[\]\(\)「」【】《》〈〉♩♬♪🎤►►\.,!?✔♥#@&\/\\]/g, ' ')
    .replace(/karaoke|beat|official|instrumental|lyrics|version|live|full|hạ tone|tone nam|tone nữ|tone gốc|beat chuẩn|beat gốc/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getKeywords(s) {
  return s.split(' ').filter(w => w.length > 2);
}

function match(entry) {
  const eNorm = normalize(entry);
  const eKeywords = getKeywords(eNorm);
  
  for (const songNorm of songNames) {
    const sKeywords = getKeywords(songNorm);
    let hits = 0;
    for (const sk of sKeywords) {
      if (eNorm.includes(sk)) hits++;
    }
    // bonus if song name is mostly contained
    if (songNorm.length > 5 && eNorm.includes(songNorm)) hits += 3;
    if (eNorm.length > 5 && songNorm.includes(eNorm)) hits += 3;
    
    // If most keywords match
    if (sKeywords.length > 0 && hits / sKeywords.length >= 0.5) {
      return true;
    }
  }
  return false;
}

let newSongs = [];
for (const entry of entries) {
  if (!match(entry)) {
    newSongs.push(entry);
  }
}

// Also check the special ones
console.log(`Playlist non-NA: ${entries.length}`);
console.log(`Bài trong SONGS.md: ${songNames.length}`);
console.log(`Bài mới (chưa có): ${newSongs.length}\n`);

for (const s of newSongs) {
  // Clean title for display
  let t = s;
  // Also show which song name to suggest
  const simple = s.replace(/[\[\]「」【】《》♩♬♪🎤►►]/g, '').trim();
  console.log(`🆕 ${simple}`);
}
