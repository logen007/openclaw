// Test access to new sheet
import { getToken } from './sheets-jwt.mjs';

const SHEET_ID = '1QSJHCx1MLOBIjHDhCqeIukYmj5AtDGOvaizrnKLCtog';

async function main() {
  const token = await getToken(true); // write scope

  const resp = await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + SHEET_ID, { headers: { Authorization: 'Bearer ' + token } });
  const data = await resp.json();
  if (!resp.ok) {
    console.log('❌ ' + data.error.message);
  } else {
    console.log('✅ Đọc được!');
    console.log('Sheets:', data.sheets.map(s => s.properties.title));
  }
}
main().catch(e => console.log('❌ ' + e.message));
