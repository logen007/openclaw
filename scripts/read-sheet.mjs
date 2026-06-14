import { readFileSync, writeFileSync } from 'fs';
import { google } from 'googleapis';

const SHEET_ID = '1QSJHCx1MLOBIjHDhCqeIukYmj5AtDGOvaizrnKLCtog';

// Authenticate with service account
const auth = new google.auth.GoogleAuth({
  keyFile: '/home/openclaw/.openclaw/credentials/google-service-account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: 'PlayList!A:D',
});

const rows = res.data.values || [];
console.log(`Read ${rows.length} rows from sheet`);

// Generate SONGS.md format
let md = '# Danh sách bài hát Karaoke 🎤\n\n';
let songCount = 0;

for (const row of rows) {
  const song = (row[0] || '').trim();
  const available = (row[1] || '').trim().toUpperCase();
  const note = (row[2] || '').trim();
  const videoId = (row[3] || '').trim();

  if (!song || song === 'Song' || song === 'Bài hát') continue; // Skip header

  // Empty means available, or 'YES'
  if (available === '' || available === 'YES') {
    md += `- ${song}\n`;
    songCount++;
  }
}

console.log(`Generated SONGS.md with ${songCount} songs`);
writeFileSync('/home/openclaw/.openclaw/workspace/karaoke/SONGS.md', md, 'utf8');
console.log('Written to /home/openclaw/.openclaw/workspace/karaoke/SONGS.md');
