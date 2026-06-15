import { readSheet } from './sheets-jwt.mjs';

const SPREADSHEET_ID = '1b41Q0HDaLwwBtBXXR38RVJh_eLigrXN6PYcteIYHhBM';

async function main() {
  const data = await readSheet(SPREADSHEET_ID, 'Jun 2026!A:O');
  
  const rows = data.values || [];
  const today = new Date();
  const DAY = parseInt(process.argv[2]) || 12;

  let todayOrders = [];
  let totalRevenue = 0;
  let totalPayout = 0;
  let totalCost = 0;
  let totalProfitKnown = 0;
  let totalProfitEstimated = 0;
  let estimatedCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || row[0].trim() === '') continue;
    
    const ts = row[0].trim();
    const match = ts.match(/^(\d+)\s*-\s*/);
    if (!match) continue;
    
    const day = parseInt(match[1]);
    if (day !== DAY) continue;
    
    const source = (row[5] || '').trim();
    const total = parseFloat(row[7]) || 0;
    const payout = parseFloat(row[8]) || 0;
    const cost = parseFloat(row[9]) || 0;
    const profit = parseFloat(row[10]) || 0;
    const roas = parseFloat(row[11]) || 0;
    
    todayOrders.push({
      time: ts,
      name: row[2] || '',
      country: row[3] || '',
      total,
      payout,
      cost,
      profit,
      roas,
      source: source || 'unknown',
      hasCost: row[9] !== undefined && row[9].trim() !== '' && !isNaN(parseFloat(row[9])),
    });
    
    totalRevenue += total;
    totalPayout += payout;
    
    if (todayOrders[todayOrders.length-1].hasCost) {
      totalCost += cost;
      totalProfitKnown += profit;
    } else {
      const est = payout * 0.55;
      totalProfitEstimated += est;
      estimatedCount++;
    }
  }

  const ordersWithCost = todayOrders.filter(o => o.hasCost);
  if (ordersWithCost.length > 0) {
    const avgMargin = ordersWithCost.reduce((s, o) => s + o.profit/o.payout, 0) / ordersWithCost.length;
    totalProfitEstimated = 0;
    for (const o of todayOrders) {
      if (o.hasCost) continue;
      totalProfitEstimated += o.payout * avgMargin;
    }
  }

  const totalProfit = totalProfitKnown + totalProfitEstimated;

  const bySource = {};
  for (const o of todayOrders) {
    const s = o.source || 'unknown';
    if (!bySource[s]) bySource[s] = { count: 0, revenue: 0, profit: 0 };
    bySource[s].count++;
    bySource[s].revenue += o.total;
    if (o.hasCost) bySource[s].profit += o.profit;
    else bySource[s].profit += o.payout * 0.55;
  }

  console.log(`📊 HÔM NAY — ${DAY}/6`);
  console.log(`─────────────────`);
  console.log(`Orders: ${todayOrders.length}`);
  console.log(`Doanh thu: $${totalRevenue.toFixed(2)}`);
  console.log(`Payout: $${totalPayout.toFixed(2)}`);
  console.log(`Cost (đã ghi): $${totalCost.toFixed(2)}`);
  console.log(`Lợi nhuận (đã biết): $${totalProfitKnown.toFixed(2)}`);
  console.log(`Lợi nhuận (ước tính): $${totalProfitEstimated.toFixed(2)}`);
  console.log(`Tổng lợi nhuận: $${totalProfit.toFixed(2)}`);
  console.log(`(${estimatedCount} đơn ước tính)`);
  console.log(``);
  console.log(`Nguồn:`);
  for (const [src, info] of Object.entries(bySource)) {
    console.log(`  ${src}: ${info.count} đơn — $${info.revenue.toFixed(2)}`);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
