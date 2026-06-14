/**
 * Shared Google Sheets JWT authentication module
 * Used by all sheet-related scripts to avoid code duplication.
 * 
 * Usage:
 *   import { getToken } from './sheets-jwt.mjs';
 *   const token = await getToken();
 */
import { createPrivateKey, sign } from 'crypto';
import { readFileSync } from 'fs';

const KEY_PATH = '/home/openclaw/.openclaw/credentials/google-service-account.json';
const DEFAULT_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const WRITE_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

const key = JSON.parse(readFileSync(KEY_PATH, 'utf8'));

function base64url(str) {
  return Buffer.from(str).toString('base64url');
}

function getJwt(scope) {
  const header = { alg: 'RS256', typ: 'JWT', kid: key.private_key_id };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: key.client_email,
    scope,
    aud: key.token_uri,
    exp: now + 3600,
    iat: now,
  };
  const payload = base64url(JSON.stringify(header)) + '.' + base64url(JSON.stringify(claim));
  const privateKey = createPrivateKey(key.private_key);
  const sig = sign(null, Buffer.from(payload), privateKey);
  return payload + '.' + base64url(sig);
}

/**
 * Get an OAuth access token for Google Sheets API
 * @param {boolean} writeAccess - If true, request write scope instead of readonly
 * @returns {Promise<string>} Access token
 */
export async function getToken(writeAccess = false) {
  const scope = writeAccess ? WRITE_SCOPE : DEFAULT_SCOPE;
  const jwt = getJwt(scope);
  const resp = await fetch(key.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

/**
 * Read data from a Google Sheet
 * @param {string} spreadsheetId - The sheet ID
 * @param {string} range - Range string (e.g. 'Sheet1!A:Z')
 * @param {boolean} writeAccess - Request write scope
 * @returns {Promise<object>} Sheet data response
 */
export async function readSheet(spreadsheetId, range, writeAccess = false) {
  const token = await getToken(writeAccess);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`API error: ${JSON.stringify(data)}`);
  return data;
}
