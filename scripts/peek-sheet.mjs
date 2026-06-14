import { readFileSync } from 'fs';
import { getToken, readSheet } from './sheets-jwt.mjs';

const SPREADSHEET_ID = '1b41Q0HDaLwwBtBXXR38RVJh_eLigrXN6PYcteIYHhBM';

async function main() {
  const data = await readSheet(SPREADSHEET_ID, 'Jun 2026!A:L');
  const rows = data.values || [];
  
  console.log(`Total rows (incl header): ${rows.length}\n`);
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    console.log(`Row ${i}: ${JSON.stringify(rows[i])}`);
  }
  console.log('...');
  
  // Show last 10 rows
  for (let i = Math.max(5, rows.length - 10); i < rows.length; i++) {
    console.log(`Row ${i}: ${JSON.stringify(rows[i])}`);
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
