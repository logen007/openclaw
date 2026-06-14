import { readFileSync } from 'fs';
import { getToken } from './sheets-jwt.mjs';

const SHEET_ID = '1QSJHCx1MLOBIjHDhCqeIukYmj5AtDGOvaizrnKLCtog';
const TAB = 'PlayList';

async function main() {
  const token = await getToken(true); // write scope

  const songsMd = readFileSync('/home/openclaw/.openclaw/workspace/karaoke/SONGS.md', 'utf8');
  const rows = [['Song', 'Available', 'Note']];
  let note = '';

  for (const line of songsMd.split('\n')) {
    const t = line.trim();
    if (t.startsWith('- ')) {
      const content = t.substring(2).trim();
      const parts = content.split('|').map(p => p.trim());
      const song = parts[0] || '';
      rows.push([song, '', parts.slice(1).join(', ').trim()]);
    }
  }

  // Skip clear - just PUT directly to overwrite
  const body = { values: rows, majorDimension: 'ROWS' };
  const resp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${TAB}!A1:C${rows.length}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );
  const result = await resp.json();
  if (!resp.ok) {
    console.error('Write error:', resp.status, JSON.stringify(result).substring(0, 300));
    process.exit(1);
  }
  console.log(`✅ Done! ${rows.length - 1} songs written to PlayList tab`);
}
main().catch(e => { console.error(e.message); process.exit(1); });
