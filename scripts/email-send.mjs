import { getTransporter } from './email-config.mjs';

const [, , to, subject, ...bodyParts] = process.argv;
const body = bodyParts.join(' ');

if (!to || !subject) {
  console.log('Usage: node email-send.mjs <to> <subject> [body]');
  process.exit(1);
}

try {
  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from: '"Vy AI" <tranc333@gmail.com>',
    to,
    subject,
    text: body || '(no content)',
  });
  console.log(`✅ Sent to ${to}`);
  console.log(`   Message ID: ${info.messageId}`);
  process.exit(0);
} catch (e) {
  console.error(`❌ Failed: ${e.message}`);
  process.exit(1);
}
