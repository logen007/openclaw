import { readSheet } from './sheets-jwt.mjs';

const SPREADSHEET_ID = '1b41Q0HDaLwwBtBXXR38RVJh_eLigrXN6PYcteIYHhBM';

async function main() {
  const data = await readSheet(SPREADSHEET_ID, 'Jun 2026!A:O');
  const rows = data.values || [];

  // Phân tích margin
  const srcMargins = { overall: { payouts: 0, profits: 0 } };
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    const src = (row[5] || '').trim();
    const payout = parseFloat(row[8]) || 0;
    const cost = parseFloat(row[9]);
    if (!isNaN(cost) && cost > 0) {
      const profit = parseFloat(row[10]) || 0;
      if (!srcMargins[src]) srcMargins[src] = { payouts: 0, profits: 0 };
      srcMargins[src].payouts += payout;
      srcMargins[src].profits += profit;
      srcMargins.overall.payouts += payout;
      srcMargins.overall.profits += profit;
    }
  }

  const day = parseInt(process.argv[2]) || 11;
  const orders = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || !row[0].trim()) continue;
    const m = row[0].trim().match(/^(\d+)\s*-\s*/);
    if (!m || parseInt(m[1]) !== day) continue;

    const source = (row[5] || '').trim();
    const total = parseFloat(row[7]) || 0;
    const payout = parseFloat(row[8]) || 0;
    const hasCost = row[9] !== undefined && row[9].trim() !== '' && !isNaN(parseFloat(row[9]));
    const cost = hasCost ? parseFloat(row[9]) : 0;
    const profit = hasCost ? (parseFloat(row[10]) || 0) : 0;

    if (total === 0) continue;

    orders.push({ time: row[0], name: row[2], country: row[3], source, total, payout, cost, profit, hasCost });
  }

  // Tính margin cho ước tính — lấy margin trung bình theo source nếu có, fallback overall
  function estProfit(payout, source) {
    const s = srcMargins[source];
    if (s && s.payouts > 0) return payout * (s.profits / s.payouts);
    return payout * (srcMargins.overall.profits / srcMargins.overall.payouts);
  }

  let rev = 0, payoutT = 0, costT = 0, profitKnown = 0, profitEst = 0, estCount = 0;
  for (const o of orders) {
    rev += o.total;
    payoutT += o.payout;
    if (o.hasCost) { costT += o.cost; profitKnown += o.profit; }
    else { profitEst += estProfit(o.payout, o.source); estCount++; }
  }

  // Nguồn
  const srcSummary = {};
  for (const o of orders) {
    if (!srcSummary[o.source]) srcSummary[o.source] = { count: 0, rev: 0, profit: 0 };
    srcSummary[o.source].count++;
    srcSummary[o.source].rev += o.total;
    srcSummary[o.source].profit += o.hasCost ? o.profit : estProfit(o.payout, o.source);
  }

  const totalProfit = profitKnown + profitEst;

  console.log(`📊 HÔM QUA — ${day}/6`);
  console.log(`─────────────────────`);
  console.log(`Orders: ${orders.length}`);
  console.log(`Doanh thu: $${rev.toFixed(2)}`);
  console.log(`Payout: $${payoutT.toFixed(2)}`);
  console.log(`Cost (đã ghi): $${costT.toFixed(2)}`);
  console.log(`Lợi nhuận (đã biết): $${profitKnown.toFixed(2)}`);
  console.log(`Lợi nhuận (ước tính): $${profitEst.toFixed(2)} (${estCount} đơn)`);
  console.log(`Tổng lợi nhuận: $${totalProfit.toFixed(2)}`);
  console.log(`─────────────────────`);
  
  console.log(`\nTheo nguồn:`);
  const sorted = Object.entries(srcSummary).sort((a,b) => b[1].rev - a[1].rev);
  for (const [src, info] of sorted) {
    console.log(`  ${src}: ${info.count}đ — $${info.rev.toFixed(2)} (lãi ~$${info.profit.toFixed(2)})`);
  }

  console.log(`\nChi tiết đơn hàng:`);
  for (const o of orders) {
    const p = o.hasCost ? o.profit : estProfit(o.payout, o.source);
    const tag = o.hasCost ? '✓' : '~';
    console.log(`  ${o.time.replace(/^\d+\s*-\s*/, '')} | ${o.source} | ${o.name} (${o.country}) | $${o.total.toFixed(2)} → lãi ${tag}$${p.toFixed(2)}`);
  }
}
main().catch(e => { console.error(e.message); process.exit(1); });
