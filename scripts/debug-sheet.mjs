import { readFileSync, writeFileSync } from 'fs';
import { google } from 'googleapis';

const SHEET_ID = '1QSJHCx1MLOBIjHDhCqeIukYmj5AtDGOvaizrnKLCtog';

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
console.log(`Total rows: ${rows.length}`);
console.log('--- First 5 rows ---');
for (let i = 0; i < Math.min(5, rows.length); i++) {
  console.log(`Row ${i}:`, JSON.stringify(rows[i]));
}
console.log('--- Last 5 rows ---');
for (let i = Math.max(0, rows.length - 5); i < rows.length; i++) {
  console.log(`Row ${i}:`, JSON.stringify(rows[i]));
}
