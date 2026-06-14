import { getImapClient } from './email-config.mjs';

const limit = parseInt(process.argv[2]) || 5;

try {
  const client = getImapClient();
  await client.connect();

  const lock = await client.getMailboxLock('INBOX');
  try {
    const status = await client.status('INBOX', { messages: true });
    const total = status.messages || 0;
    
    if (total === 0) {
      console.log('📭 Inbox trống.');
      process.exit(0);
    }

    const start = Math.max(1, total - limit + 1);
    const msgs = [];
    
    for await (const msg of client.fetch(`${start}:*`, { envelope: true, flags: true })) {
      msgs.push(msg);
    }
    
    // Sort by seq descending
    msgs.sort((a, b) => b.seq - a.seq);

    console.log(`📥 ${msgs.length} email gần nhất (tổng: ${total}):\n`);
    for (const m of msgs) {
      const from = m.envelope.from?.map(f => f.address).join(', ') || '?';
      const date = m.envelope.date ? new Date(m.envelope.date).toISOString().replace('T', ' ').slice(0, 16) : '?';
      const unread = m.flags?.has?.('\\Seen') ? false : true;
      const flags = unread ? '●' : '✓';
      console.log(`${flags} [${date}] ${m.envelope.subject || '(no subject)'}`);
      console.log(`   From: ${from}`);
      console.log(`   Seq: #${m.seq}\n`);
    }
  } finally {
    lock.release();
  }
  
  await client.logout();
  process.exit(0);
} catch (e) {
  console.error(`❌ Failed: ${e.message}`);
  process.exit(1);
}
