#!/usr/bin/env node
// KA — Email conversation monitor
// Runs via cron to check for replies and continue the conversation
// State file: ~/.openclaw/state/ka-email-chat.json

import { readFileSync, writeFileSync } from 'fs';
import { getTransporter, getImapClient } from '/home/openclaw/.openclaw/workspace/scripts/email-config.mjs';

const STATE_FILE = '/home/openclaw/.openclaw/state/ka-email-chat.json';
const state = JSON.parse(readFileSync(STATE_FILE, 'utf8'));

if (!state.active) {
  console.log('⏹️ Conversation already ended, exiting.');
  process.exit(0);
}

const MAX_ROUND = 10;
const TARGET = state.target;

// ──── Conversation script: reply for each round ────
const replies = {
  2: { subject: 'Hihi câu đố tiếp 😄', body: 'Chuẩn rồi! Đáp án là \"con cua\" — càng to thì càng nhỏ (ý nói càng cua to ra thì thân nó càng nhỏ lại 😂).\n\nTiếp nè: Cái gì càng rửa càng dơ? 🤔' },
  3: { subject: 'Đúng rồi, giỏi quá! 👏', body: 'Hay lắm! Đáp án: nước (càng rửa càng dơ là nước rửa bát đó 😆)\n\nCâu tiếp: Cái gì đi thì nằm, đứng cũng nằm, nhưng nằm lại đứng?' },
  4: { subject: 'Đố thêm nè 🤣', body: 'Đúng rồi! Là cái bàn chân — đi thì nằm (chân đặt xuống), đứng cũng nằm (chân vẫn ở dưới), nằm thì đứng (chân dựng lên) 😂\n\nCâu nữa: Quả gì ăn vào điếc cả ngày?' },
  5: { subject: 'Chuẩn luôn! 😂', body: 'Giỏi thật! Quả sầu riêng — đùa thôi, trái sầu riêng đó 😆\n\nMini game: Tìm điểm chung giữa một cái bóng đèn và một con mèo?' },
  6: { subject: 'Thú vị nè 😎', body: 'Chuẩn! Cả hai đều \"phát sáng\" — mèo mắt sáng trong tối, bóng đèn phát sáng 😂\n\nĐố mẹo: Có 3 thằng mù và 1 cái kính lúp. Hỏi thấy gì?' },
  7: { subject: 'Trả lời hay quá 🤩', body: 'Haha đúng rồi! 3 thằng mù thì thấy 3 thằng mù thôi, kính lúp cũng vô dụng 😂\n\nChuyển chủ đề: Bạn có biết vì sao cá không bao giờ bị ốm không?' },
  8: { subject: 'Đáp án đây 😁', body: 'Vì cá luôn ở trong nước nên uống thuốc hoài (hoài = phí, chơi chữ \"ho\") 🤣\n\nNghiêm túc xíu: Mình thấy chat với bạn vui ghê. Có gì hay ho không kể mình nghe với?' },
  9: { subject: 'Hay ghê 😊', body: 'Ui vậy hả, vui quá! Mình cũng thấy vui vì hôm nay có người chat cùng. Nói chuyện với bạn dễ thương thiệt sự!\n\nMà thôi, khuya rồi để mình đi ngủ nha. Hôm khác mình đố tiếp. Chúc bạn ngủ ngon! 🌙' },
  10: { subject: 'Tạm biệt nhé!', body: 'Hi bạn, mình hơi bận chút việc đột xuất nên không nói chuyện tiếp được. Hẹn hôm khác mình đố tiếp nha! Chúc bạn một ngày vui vẻ ❤️\n\nP/s: Nếu bạn có câu đố nào hay thì cứ gửi, mình đọc sau nhé 😄' },
};

async function readInbox() {
  const client = getImapClient();
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const search = await client.search({ from: TARGET });
      if (!search.length) return null;
      const latestSeq = search[search.length - 1];
      return { seq: latestSeq };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

async function sendReply(round) {
  const data = replies[round];
  if (!data) {
    console.log('No reply content for round ' + round + ', ending.');
    state.active = false;
    saveState();
    return false;
  }
  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from: '"Vy AI" <tranc333@gmail.com>',
    to: TARGET,
    subject: data.subject,
    text: data.body,
  });
  console.log('✅ Round ' + round + ': Sent "' + data.subject + '"');
  state.round = round;
  state.lastSubject = data.subject;
  saveState();
  return true;
}

function saveState() {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ──── MAIN ────
const nextRound = state.round + 1;
console.log('📋 Current round: ' + state.round + ', next: ' + nextRound + '/' + MAX_ROUND);

if (nextRound > MAX_ROUND) {
  console.log('🏁 Max rounds reached. Ending.');
  state.active = false;
  saveState();
  process.exit(0);
}

const latestEmail = await readInbox();
if (!latestEmail) {
  console.log('⏳ No new email from ' + TARGET + '. Waiting...');
  process.exit(0);
}

console.log('📩 New email detected! Sending reply round ' + nextRound + '...');
await sendReply(nextRound);

if (nextRound === MAX_ROUND) {
  state.active = false;
  saveState();
  console.log('🏁 Conversation complete!');
}
process.exit(0);
