import { readFileSync } from 'fs';
import { getToken, readSheet } from './sheets-jwt.mjs';

const SPREADSHEET_ID = '1b41Q0HDaLwwBtBXXR38RVJh_eLigrXN6PYcteIYHhBM';

async function main() {
  const data = await readSheet(SPREADSHEET_ID, 'Jun 2026!A:L');
  const rows = data.values || [];

  // Parse all orders
  const allOrders = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0] || String(row[0]).trim() === '') continue;
    const ts = String(row[0]).trim();
    const match = ts.match(/^(\d+)\s*-\s*/);
    if (!match) continue;
    const day = parseInt(match[1]);
    const source = (row[5] || '').trim();
    const total = parseFloat(row[7]) || 0;
    const payout = parseFloat(row[8]) || 0;
    const costRaw = row[9] !== undefined ? String(row[9]).trim() : '';
    const hasCost = costRaw !== '' && !isNaN(parseFloat(costRaw));
    const cost = hasCost ? parseFloat(costRaw) : 0;
    const profit = hasCost ? payout - cost : payout; // based on formula: K = payout - cost
    const name = row[2] || '';
    
    allOrders.push({ day, ts, source, total, payout, cost, profit, hasCost, name });
  }

  // Build margin database from all orders that have cost data
  const marginBySource = {};
  for (const o of allOrders) {
    if (o.hasCost && o.payout > 0) {
      const margin = o.profit / o.payout;
      if (!marginBySource[o.source]) marginBySource[o.source] = [];
      marginBySource[o.source].push(margin);
    }
  }

  function getAvgMargin(source) {
    if (marginBySource[source] && marginBySource[source].length > 0) {
      const m = marginBySource[source];
      return m.reduce((a,b) => a+b, 0) / m.length;
    }
    // fallback: all sources combined
    const all = Object.values(marginBySource).flat();
    if (all.length > 0) return all.reduce((a,b) => a+b, 0) / all.length;
    return 0.55;
  }

  // Report for specified day (default: yesterday, override via CLI arg: node brick-report.mjs <day>)
  const DAY = parseInt(process.argv[2]) || 13;
  const dayOrders = allOrders.filter(o => o.day === DAY);

  let totalRevenue = 0, totalPayout = 0;
  let profitKnown = 0, profitEstimated = 0;
  let knownCount = 0, estimatedCount = 0;
  const bySource = {};

  for (const o of dayOrders) {
    totalRevenue += o.total;
    totalPayout += o.payout;
    
    if (!bySource[o.source]) bySource[o.source] = { count: 0, revenue: 0, profit: 0, estimated: 0 };

    bySource[o.source].count++;
    bySource[o.source].revenue += o.total;

    if (o.hasCost) {
      knownCount++;
      profitKnown += o.profit;
      bySource[o.source].profit += o.profit;
    } else {
      estimatedCount++;
      const avgMarg = getAvgMargin(o.source);
      const estProfit = o.payout * avgMarg;
      profitEstimated += estProfit;
      bySource[o.source].profit += estProfit;
      bySource[o.source].estimated++;
    }
  }

  const totalProfit = profitKnown + profitEstimated;
  const avgMarginUsed = getAvgMargin('googleads');

  // === BRICK REPORT ===
  console.log(`📊 NGÀY ${DAY}/6 (giờ LA)`);
  console.log(`• Đơn: ${dayOrders.length} • Revenue: $${totalRevenue.toFixed(2)} • Profit: ~$${totalProfit.toFixed(2)}`);

  for (const [src, info] of Object.entries(bySource)) {
    console.log(`• ${src}: ${info.count} đơn $${info.revenue.toFixed(2)}`);
  }

  if (estimatedCount > 0) {
    console.log(`• (ước tính) ${estimatedCount} đơn chưa có cost — dùng avg margin ${(avgMarginUsed*100).toFixed(0)}%`);
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
