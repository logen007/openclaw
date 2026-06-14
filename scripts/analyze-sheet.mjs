import { readSheet } from './sheets-jwt.mjs';

const SPREADSHEET_ID = '1b41Q0HDaLwwBtBXXR38RVJh_eLigrXN6PYcteIYHhBM';

async function main() {
  const d = await readSheet(SPREADSHEET_ID, 'Jun 2026!A:O');
  
  const rows = d.values || [];
  console.log('Tổng số dòng:', rows.length);
  
  // Phân tích margin theo source
  const withCost = []; // orders có cost
  const noCost = [];   // orders không có cost
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || !row[0].trim()) continue;
    const ts = row[0].trim().match(/^(\d+)\s*-\s*/);
    if (!ts) continue;
    
    const source = (row[5] || '').trim();
    const total = parseFloat(row[7]) || 0;
    const payout = parseFloat(row[8]) || 0;
    const hasCost = row[9] !== undefined && row[9].trim() !== '' && !isNaN(parseFloat(row[9]));
    const cost = hasCost ? parseFloat(row[9]) : 0;
    const profit = hasCost ? (parseFloat(row[10]) || 0) : 0;
    
    if (total === 0 && payout === 0) continue;
    
    const entry = { day: parseInt(ts[1]), time: row[0], name: row[2], country: row[3], source, total, payout, cost, profit };
    
    if (hasCost && cost > 0 && profit > 0) {
      entry.marginPct = profit / payout * 100;
      entry.costPct = cost / total * 100;
      withCost.push(entry);
    } else {
      noCost.push(entry);
    }
  }
  
  // Margin trung bình theo source
  const bySource = {};
  for (const o of withCost) {
    if (!bySource[o.source]) bySource[o.source] = { orders: [], margins: [], totals: 0, payouts: 0, costs: 0, profits: 0 };
    bySource[o.source].orders.push(o);
    bySource[o.source].margins.push(o.marginPct);
    bySource[o.source].totals += o.total;
    bySource[o.source].payouts += o.payout;
    bySource[o.source].costs += o.cost;
    bySource[o.source].profits += o.profit;
  }
  
  console.log('\n=== MARGIN THEO NGUỒN (từ orders có cost) ===');
  for (const [src, data] of Object.entries(bySource)) {
    const avgMargin = data.margins.reduce((a,b) => a+b, 0) / data.margins.length;
    const avgCostOfTotal = data.costs / data.totals * 100;
    console.log(`\n${src} (${data.orders.length} đơn):`);
    console.log(`  Margin trung bình: ${avgMargin.toFixed(1)}%`);
    console.log(`  Cost/Total trung bình: ${avgCostOfTotal.toFixed(1)}%`);
    console.log(`  Range margin: ${Math.min(...data.margins).toFixed(1)}% - ${Math.max(...data.margins).toFixed(1)}%`);
    console.log(`  Tổng: $${data.totals.toFixed(2)} → profit $${data.profits.toFixed(2)}`);
  }
  
  // Overall
  const totalWithCost = withCost.reduce((s,o) => s + o.payout, 0);
  const totalProfitWC = withCost.reduce((s,o) => s + o.profit, 0);
  const overallMargin = totalProfitWC / totalWithCost * 100;
  console.log(`\n=== OVERALL ===`);
  console.log(`Orders có cost: ${withCost.length}`);
  console.log(`Orders chưa có cost: ${noCost.length}`);
  console.log(`Overall margin: ${overallMargin.toFixed(1)}%`);
  
  // Orders hôm nay (day 12)
  const todayOrders = [...withCost, ...noCost].filter(o => o.day === 12);
  
  // Nếu có orders hôm nay
  if (todayOrders.length > 0) {
    let rev = 0;
    for (const o of noCost.filter(o => o.day === 12)) {
      rev += o.total;
    }
  }
}
main().catch(e => { console.error(e.message); process.exit(1); });
