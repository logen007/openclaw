import { getImapClient } from './email-config.mjs';

const seq = parseInt(process.argv[2]);
if (!seq) {
  console.log('Usage: node email-read.mjs <sequence_number>');
  console.log('Tip: dùng email-inbox.mjs để xem sequence number');
  process.exit(1);
}

try {
  const client = getImapClient();
  await client.connect();

  const lock = await client.getMailboxLock('INBOX');
  try {
    const msg = await client.fetchOne(`${seq}`, {
      envelope: true,
      bodySource: true,
      flags: true,
    });

    if (!msg) {
      console.log(`❌ Không tìm thấy email sequence ${seq}`);
      process.exit(1);
    }

    const from = msg.envelope.from?.map(f => `${f.name || ''} <${f.address}>`).join(', ') || '?';
    const to = msg.envelope.to?.map(f => `${f.name || ''} <${f.address}>`).join(', ') || '?';
    const date = msg.envelope.date ? new Date(msg.envelope.date).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '?';
    const subject = msg.envelope.subject || '(no subject)';
    const body = msg.bodySource?.toString('utf-8') || '(no content)';
    const unread = msg.flags?.has?.('\\Seen') ? false : true;

    console.log(`📧 ${subject}`);
    console.log(`━`.repeat(50));
    console.log(`From: ${from}`);
    console.log(`To:   ${to}`);
    console.log(`Date: ${date} ${unread ? '(chưa đọc)' : '(đã đọc)'}`);
    console.log(`━`.repeat(50));
    console.log(body.substring(0, 5000));
  } finally {
    lock.release();
  }

  await client.logout();
  process.exit(0);
} catch (e) {
  console.error(`❌ Failed: ${e.message}`);
  process.exit(1);
}
