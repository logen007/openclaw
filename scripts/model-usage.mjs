#!/usr/bin/env node
/**
 * Model Usage Tracker — OpenClaw
 * Query SQLite DB for model usage, token counts, costs, and runtime.
 * Thay thế cho CodexBar (macOS-only) trên Linux.
 * 
 * Usage:
 *   node scripts/model-usage.mjs                  # Today's summary
 *   node scripts/model-usage.mjs --all             # All time
 *   node scripts/model-usage.mjs --details         # Per-run detail
 *   node scripts/model-usage.mjs --days 7          # Last 7 days
 */

import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';

const DB = join(homedir(), '.openclaw/state/openclaw.sqlite');

function query(sql) {
  const out = execSync(`sqlite3 -json "${DB}" "${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf8', timeout: 5000 });
  return JSON.parse(out || '[]');
}

const mode = process.argv[2] || 'today';

// Model pricing (USD per 1M tokens) — fallback when DB doesn't have costs
const MODEL_PRICING = {
  'deepseek/deepseek-v4-flash':       { input: 0.20, output: 0.40 },
  'google/gemini-3-flash-preview':    { input: 0.075, output: 0.30 },
  'google/gemini-3.1-pro-preview':    { input: 1.25, output: 5.00 },
  'deepseek/deepseek-reasoner':       { input: 0.55, output: 2.19 },
  'deepseek/deepseek-chat':           { input: 0.27, output: 1.10 },
  'gemini-3-flash-preview':           { input: 0.075, output: 0.30 },
};

function getModelCost(modelId) {
  // Try DB first
  const rows = query(`SELECT cost_input, cost_output FROM model_capability_cache WHERE model_id = '${modelId.replace(/'/g,"''")}' LIMIT 1`);
  if (rows.length > 0 && rows[0].cost_input > 0) {
    return { input: rows[0].cost_input, output: rows[0].cost_output };
  }
  // Fallback to hardcoded pricing
  return MODEL_PRICING[modelId] || MODEL_PRICING[modelId.split('/').pop()] || null;
}

function calcCost(modelId, inputTokens, outputTokens) {
  const pricing = getModelCost(modelId);
  if (!pricing) return null;
  return (inputTokens * pricing.input / 1_000_000) + (outputTokens * pricing.output / 1_000_000);
}

// --- Build query based on mode ---
const now = Date.now();
let cronTimeFilter = '1=1';
let subTimeFilter = '1=1';

if (mode === '--all') {
  // no filter
} else if (mode === '--days') {
  const days = parseInt(process.argv[3]) || 7;
  const since = now - days * 86400_000;
  cronTimeFilter = `ts >= ${since}`;
  subTimeFilter = `created_at >= ${since}`;
} else {
  // Today (UTC)
  const todayStart = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
  cronTimeFilter = `ts >= ${todayStart}`;
  subTimeFilter = `created_at >= ${todayStart}`;
}

// --- Main query ---
const runs = query(`
  SELECT 
    model, provider, total_tokens, duration_ms, ts,
    strftime('%Y-%m-%d %H:%M', ts / 1000, 'unixepoch') as time_str
  FROM cron_run_logs
  WHERE ${cronTimeFilter} AND model IS NOT NULL AND model != ''
  ORDER BY ts DESC
`);

// --- Subagent runs ---
const subagents = query(`
  SELECT 
    task_name, model, accumulated_runtime_ms,
    strftime('%Y-%m-%d %H:%M', created_at / 1000, 'unixepoch') as time_str
  FROM subagent_runs
  WHERE ${subTimeFilter} AND task_name IS NOT NULL AND task_name != ''
  ORDER BY created_at DESC
`);

// --- Aggregate by model ---
const byModel = {};
let totalTokens = 0;
let totalCost = 0;
let totalDuration = 0;

for (const r of runs) {
  const model = r.model || 'unknown';
  if (!byModel[model]) byModel[model] = { runs: 0, tokens: 0, cost: 0, duration: 0 };
  byModel[model].runs++;
  byModel[model].tokens += r.total_tokens || 0;
  byModel[model].duration += r.duration_ms || 0;
  totalTokens += r.total_tokens || 0;
  totalDuration += r.duration_ms || 0;
  
  if (r.total_tokens) {
    const cost = calcCost(model, Math.floor(r.total_tokens * 0.75), Math.floor(r.total_tokens * 0.25));
    if (cost !== null) {
      byModel[model].cost += cost;
      totalCost += cost;
    }
  }
}

// --- Subagent stats ---
const byAgent = {};
for (const s of subagents) {
  const name = s.task_name || 'unnamed';
  if (!byAgent[name]) byAgent[name] = { runs: 0, duration: 0 };
  byAgent[name].runs++;
  byAgent[name].duration += s.accumulated_runtime_ms || 0;
}

// --- Output ---
const period = mode === '--all' ? 'TẤT CẢ' : mode === '--days' ? `${process.argv[3] || 7} NGÀY QUA` : 'HÔM NAY';

console.log(`📊 MODEL USAGE — ${period}`);
console.log(`━`.repeat(45));

if (runs.length === 0 && subagents.length === 0) {
  console.log('Chưa có dữ liệu.');
} else {
  if (runs.length > 0) {
    console.log(`\n🤖 Cron Runs (${runs.length} runs):`);
    console.log(`   Tokens: ${(totalTokens / 1000).toFixed(1)}K`);
    console.log(`   Thời gian: ${(totalDuration / 1000).toFixed(0)}s`);
    if (totalCost > 0) console.log(`   Chi phí ước tính: ~$${totalCost.toFixed(4)}`);

    console.log(`\n   Theo model:`);
    const sorted = Object.entries(byModel).sort((a, b) => b[1].tokens - a[1].tokens);
    for (const [m, s] of sorted) {
      const costStr = s.cost > 0 ? ` ~$${s.cost.toFixed(4)}` : '';
      console.log(`   ${m.padEnd(35)} ${s.runs}runs ${(s.tokens / 1000).toFixed(0)}Ktokens${costStr}`);
    }
  }

  if (subagents.length > 0) {
    console.log(`\n🧵 Sub-agent Runs (${subagents.length} runs):`);
    const sortedAgent = Object.entries(byAgent).sort((a, b) => b[1].duration - a[1].duration);
    for (const [name, s] of sortedAgent) {
      console.log(`   ${name.padEnd(25)} ${s.runs}runs ${(s.duration / 1000).toFixed(0)}s`);
    }
  }

  if (mode === '--details') {
    console.log(`\n📋 Chi tiết cron runs:`);
    for (const r of runs.slice(0, 20)) {
      const costStr = r.total_tokens ? ` $${(r.total_tokens * 0.000075).toFixed(4)}` : '';
      console.log(`   ${r.time_str} | ${r.model?.padEnd(30)} | ${(r.total_tokens/1000 || 0).toFixed(0)}K | ${(r.duration_ms/1000 || 0).toFixed(0)}s${costStr}`);
    }
  }
}
