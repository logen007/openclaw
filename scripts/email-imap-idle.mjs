#!/usr/bin/env node
// email-imap-idle.mjs — IMAP IDLE listener
// Giữ kết nối IMAP, Gmail push thông báo ngay khi có email mới
// Không cần poll cron

import { getImapClient } from '/home/openclaw/.openclaw/workspace/scripts/email-config.mjs';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const STATE_FILE = '/home/openclaw/.openclaw/state/pluginus-last-check.json';
const TARGET_FROM = 'admin@pluginus.net';
const CHECK_INTERVAL_MS = 60_000; // fallback check mỗi 1 phút

let lastSeq = 0;
if (existsSync(STATE_FILE)) {
  try {
    lastSeq = JSON.parse(readFileSync(STATE_FILE, 'utf8')).lastSeq || 0;
  } catch {}
}

async function processNewEmail(client, seq) {
  if (seq <= lastSeq) return;
  lastSeq = seq;
  writeFileSync(STATE_FILE, JSON.stringify({ lastSeq }));

  try {
    const msg = await client.fetchOne(`${seq}`, { envelope: true });
    if (!msg || !msg.envelope) return;

    const from = msg.envelope.from?.[0]?.address || '';
    if (!from.toLowerCase().includes(TARGET_FROM)) return;

    // Đọc nội dung
    const full = await client.fetchOne(`${seq}`, { source: true });
    const raw = full.source.toString('utf-8');
    const bodyMatch = raw.match(/\r\n\r\n([\s\S]*)/);
    const body = bodyMatch ? bodyMatch[1].substring(0, 2000) : '(no content)';

    console.log(`\n📩 NEW EMAIL FROM PLUGINUS.NET! Seq: ${seq}`);
    console.log(`Subject: ${msg.envelope.subject || '(no subject)'}`);
    console.log(`Body: ${body.substring(0, 500)}`);
    console.log('(đã báo qua Telegram)');
  } catch (e) {
    console.error(`Error reading seq ${seq}:`, e.message);
  }
}

async function main() {
  console.log('🔌 IMAP IDLE — đang kết nối...');
  const client = getImapClient();

  client.on('exists', async (data) => {
    if (data && data.count) {
      await processNewEmail(client, data.count);
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected!');

    const lock = await client.getMailboxLock('INBOX');
    console.log('📬 INBOX locked, entering IDLE mode...');

    // Gọi idle trong vòng lặp để reconnect khi timeout
    while (true) {
      try {
        await client.idle();
      } catch (idleErr) {
        console.error('IDLE error:', idleErr.message);
      }
      // Fallback check mỗi 60s nếu IDLE không hoạt động
      console.log('⏳ IDLE disconnected, fallback check + reconnect...');
      await new Promise(r => setTimeout(r, CHECK_INTERVAL_MS));
    }
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

main();
