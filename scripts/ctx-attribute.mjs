#!/usr/bin/env node
// ctx-attribute.mjs — where did a session's tokens actually go?
//
// WHY
//   Measured 2026-07-31: one session billed 38,049,799 effective input tokens across 191
//   turns — but only ~157,000 tokens of NEW CONTENT were ever created in it. The content is
//   trivial; the RE-BILLING is everything. Each turn re-sends the whole accumulated context,
//   so cost ≈ turns × average-context, not × content-size.
//
//   That distinction is the entire point of this tool. "Compress the tool output" optimises
//   the 157k. "Take fewer turns / compact sooner" optimises the 38M. Before this, we guessed
//   three times and were wrong twice.
//
//   It also guards against the rtk #582 counter-pattern: stripping input can INCREASE total
//   cost ~18% because the model emits ~50% more output to compensate, and output bills ~5x
//   input. So this reports output tokens alongside input, and never recommends compression
//   without showing both sides.
//
// WHAT IT DOES
//   Read-only parse of Claude Code JSONL transcripts. No proxy, no hook, nothing in the
//   request path. Attributes each session's context to categories, and — more importantly —
//   separates ONE-TIME content cost from RE-BILLED carry cost.
//
// USAGE
//   node ctx-attribute.mjs                 # top sessions in the last 24h
//   node ctx-attribute.mjs --hours 72      # widen the window
//   node ctx-attribute.mjs --session <id>  # one session, full category breakdown
//   node ctx-attribute.mjs --json          # machine-readable
//
// COST MODEL (squeez's cache-aware ratios — never credit the provider's cache discount
//   to your own optimisation): input x1.0, cache-write x1.25, cache-read x0.1, output x5.

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const PROJECTS = join(homedir(), '.claude/projects');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const HOURS = Number(arg('--hours', 24));
const ONLY = arg('--session', null);
const JSON_OUT = argv.includes('--json');

// Effective-cost weights. Cache reads are ~10x cheaper than fresh input; output ~5x dearer.
const W = { input: 1.0, cacheWrite: 1.25, cacheRead: 0.1, output: 5.0 };

function* walk(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith('.jsonl')) yield p;
  }
}

function analyse(file) {
  const cat = {
    tool_results: 0, tool_call_args: 0, assistant_prose: 0,
    assistant_thinking: 0, user_text: 0,
  };
  const toolByName = {};
  let turns = 0, firstCtx = null, lastCtx = null, prevCtx = null;
  let effIn = 0, rawIn = 0, cacheRead = 0, cacheWrite = 0, out = 0;
  let growth = 0, sidechain = false, cwd = null, model = null;
  const deltas = [];
  const pending = new Map();

  let lines;
  try { lines = readFileSync(file, 'utf8').split('\n'); } catch { return null; }

  for (const line of lines) {
    if (!line.trim()) continue;
    let d; try { d = JSON.parse(line); } catch { continue; }
    if (d.isSidechain) { sidechain = true; continue; } // sub-agent traffic is its own context
    cwd = d.cwd || cwd;
    const m = d.message || {};
    const u = m.usage || {};
    const content = Array.isArray(m.content) ? m.content : [];

    if (d.type === 'assistant') {
      if (u && (u.input_tokens != null || u.cache_read_input_tokens != null)) {
        model = m.model || model;
        const ctx = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
        if (firstCtx === null) firstCtx = ctx;
        lastCtx = ctx;
        if (prevCtx !== null) { const dl = ctx - prevCtx; deltas.push(dl); if (dl > 0) growth += dl; }
        prevCtx = ctx;
        turns++;
        rawIn += u.input_tokens || 0;
        cacheRead += u.cache_read_input_tokens || 0;
        cacheWrite += u.cache_creation_input_tokens || 0;
        out += u.output_tokens || 0;
        effIn += ctx;
      }
      for (const b of content) {
        if (!b || typeof b !== 'object') continue;
        if (b.type === 'text') cat.assistant_prose += Math.floor((b.text || '').length / 4);
        else if (b.type === 'thinking') cat.assistant_thinking += Math.floor((b.thinking || '').length / 4);
        else if (b.type === 'tool_use') {
          const n = Math.floor(JSON.stringify(b.input || {}).length / 4);
          cat.tool_call_args += n;
          pending.set(b.id, b.name);
          toolByName[b.name] = (toolByName[b.name] || 0) + n;
        }
      }
    } else if (d.type === 'user') {
      if (typeof m.content === 'string') { cat.user_text += Math.floor(m.content.length / 4); continue; }
      for (const b of content) {
        if (!b || typeof b !== 'object') continue;
        if (b.type === 'tool_result') {
          const c = b.content;
          const t = typeof c === 'string' ? c
            : Array.isArray(c) ? c.map((x) => (x && x.text) || '').join(' ') : '';
          const n = Math.floor((t || '').length / 4);
          cat.tool_results += n;
          const nm = pending.get(b.tool_use_id);
          if (nm) toolByName[nm] = (toolByName[nm] || 0) + n;
        } else if (b.type === 'text') cat.user_text += Math.floor((b.text || '').length / 4);
      }
    }
  }

  if (!turns) return null;
  const content = Object.values(cat).reduce((a, b) => a + b, 0);
  const weighted = rawIn * W.input + cacheWrite * W.cacheWrite + cacheRead * W.cacheRead + out * W.output;
  return {
    file, id: file.split('/').pop().replace('.jsonl', ''), cwd, model, sidechain,
    turns, firstCtx, lastCtx, growth, effIn, rawIn, cacheRead, cacheWrite, out,
    weighted: Math.round(weighted), content, cat, toolByName,
    carryRatio: content ? effIn / content : 0,
    medianDelta: deltas.length ? deltas.slice().sort((a, b) => a - b)[Math.floor(deltas.length / 2)] : 0,
    cacheHitPct: effIn ? (100 * cacheRead) / effIn : 0,
  };
}

const cutoff = Date.now() - HOURS * 3600_000;
const rows = [];
if (!existsSync(PROJECTS)) { console.error(`no transcripts at ${PROJECTS}`); process.exit(1); }
for (const f of walk(PROJECTS)) {
  if (ONLY && !f.includes(ONLY)) continue;
  try { if (!ONLY && statSync(f).mtimeMs < cutoff) continue; } catch { continue; }
  const r = analyse(f);
  if (r && !r.sidechain) rows.push(r);
}
rows.sort((a, b) => b.effIn - a.effIn);

const n = (x) => x.toLocaleString('en-US');
if (JSON_OUT) { console.log(JSON.stringify(rows.slice(0, 20), null, 2)); process.exit(0); }

if (!rows.length) { console.log(`no main-thread sessions in the last ${HOURS}h`); process.exit(0); }

console.log(`\nCONTEXT ATTRIBUTION — ${rows.length} session(s), last ${HOURS}h\n`);
console.log('  EFFECTIVE   WEIGHTED  TURNS   CTX START→END   CARRY  SESSION');
for (const r of rows.slice(0, 12)) {
  const carry = `${r.carryRatio.toFixed(0)}x`;
  console.log(
    `  ${n(r.effIn).padStart(10)} ${n(r.weighted).padStart(10)} ${String(r.turns).padStart(6)}` +
    `  ${n(r.firstCtx).padStart(7)}→${n(r.lastCtx).padEnd(8)} ${carry.padStart(6)}  ${r.id.slice(0, 8)} ${(r.cwd || '').split('/').slice(-2).join('/')}`
  );
}

const top = rows[0];
console.log(`\n── deep dive: ${top.id.slice(0, 8)} (${top.model || 'unknown model'}) ──`);
console.log(`  turns: ${n(top.turns)}   context ${n(top.firstCtx)} → ${n(top.lastCtx)}   grew ${n(top.growth)}`);
console.log(`  median turn-to-turn growth: ${n(top.medianDelta)} tokens`);
console.log(`  cache hit: ${top.cacheHitPct.toFixed(1)}%  (fresh input ${n(top.rawIn)}, cache read ${n(top.cacheRead)})`);
console.log(`  output: ${n(top.out)} tokens — weighted x${W.output} = ${n(Math.round(top.out * W.output))}`);
console.log(`\n  NEW CONTENT created (one-time): ${n(top.content)} tokens`);
for (const [k, v] of Object.entries(top.cat).sort((a, b) => b[1] - a[1])) {
  if (!v) continue;
  console.log(`    ${n(v).padStart(9)}  ${((100 * v) / top.content).toFixed(1).padStart(5)}%  ${k}`);
}
console.log(`\n  BILLED: ${n(top.effIn)} tokens = ${top.carryRatio.toFixed(0)}x the content.`);
console.log(`  ${top.carryRatio > 20
  ? 'The content is NOT the problem — re-billing is. Fewer turns / earlier compaction beats compression.'
  : 'Carry ratio is low; content size actually matters here.'}`);

const tools = Object.entries(top.toolByName).sort((a, b) => b[1] - a[1]).slice(0, 6);
if (tools.length) {
  console.log('\n  by tool (args + results, one-time):');
  for (const [k, v] of tools) console.log(`    ${n(v).padStart(9)}  ${k}`);
}
console.log(`\n  NOTE: input compression can raise total cost ~18% (rtk #582) — the model emits`);
console.log(`  ~50% more output to compensate, and output bills ${W.output}x input. Watch both sides.\n`);
