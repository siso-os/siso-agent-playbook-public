#!/usr/bin/env node
// build-playbooks.mjs — generate the two-tier skill catalog from what is ACTUALLY on disk.
//
// WHY THIS EXISTS
//   maps/SKILLS.html was a hand-maintained router. It rotted: it listed a dozen skills
//   that no longer exist (dispatch, daytona, impeccable, convex-*) and listed retired
//   ones as live. Nothing loaded it, so nothing caught the drift. This script rebuilds
//   the routing layer from the filesystem every run, so drift is impossible.
//
// THE ARCHITECTURE (verified 2026-07-31, see CHANGELOG)
//   Skill BODIES are already lazy — only `name + description` is injected at startup.
//   So the only lever on catalog cost is the description field. Two tiers:
//
//   TIER 1 (visible, rich descriptions — full trigger vocabulary, NOT truncated):
//     · the playbook routers (one per cluster)
//     · the auto-firing reflexes, which must fire UNPROMPTED and therefore must keep
//       their full "AUTO-TRIGGER on: ..." trigger phrases
//   TIER 2 (bare name in the listing, description emptied):
//     · everything invoked deliberately. Still fully invocable by name — verified:
//       an empty-description skill loads its body normally. The harness renders it
//       as a bare name, costing ~name length instead of ~400 chars.
//
//   An agent hits a task -> a tier-1 description matches -> it invokes the playbook ->
//   the BODY loads (free until now) carrying the cluster table -> the body names the
//   tier-2 skill to load next. Three hops, each paid only when relevant.
//
// USAGE
//   node build-playbooks.mjs            # dry run — prints the plan, writes nothing
//   node build-playbooks.mjs --apply    # write playbook SKILL.md files + empty tier-2 descs
//
// SAFETY
//   · Never deletes a skill. Tier-2 demotion only empties `description:` in frontmatter.
//   · Backs up every file it edits to <file>.bak-playbooks-<timestamp>.
//   · Skips any skill whose frontmatter says `status: retired` (those are excluded
//     from the catalog entirely — they were already decommissioned by their authors).

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const HOME = homedir();
const ROOTS = [
  join(HOME, 'SISO_Workspace/SISO_Agent_Base/templates/profile/skills'),
  join(HOME, '.claude/skills'),
];
const APPLY = process.argv.includes('--apply');
const STAMP = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1: reflexes that MUST keep full descriptions.
// These fire unprompted. Emptying their description silences the doctrine —
// measured: fan-out had only 4 invocations while its trigger-phrase list was
// being severed by the 160-char cap.
// ─────────────────────────────────────────────────────────────────────────────
const REFLEXES = new Set([
  'lesson', 'ponytail', 'reflect', 'classify-by-reading',
  'prove-before-claim', 'preflight-lessons', 'fan-out',
]);

// ─────────────────────────────────────────────────────────────────────────────
// CLUSTERS: scenario -> member skills. Derived from maps/SKILLS.html's cluster
// logic, corrected against the live inventory. Members that don't exist on disk
// are dropped at build time with a warning (that is the anti-rot mechanism).
// ─────────────────────────────────────────────────────────────────────────────
const CLUSTERS = [
  {
    slug: 'pb-research',
    title: 'Research & Information Gathering',
    useWhen:
      'gathering information before building or deciding — web search, GitHub/OSS code search, ' +
      'deep research, scraping a site, querying prior art or mined insights.',
    triggers: [
      'research X', 'look into', 'find out', 'what is the state of', 'search the web',
      'find repos/libraries that', 'scrape this site', 'what did we learn about',
      'prior art', 'compare options', 'is there an existing tool for',
    ],
    members: [
      ['multisearch', 'Web + GitHub + X in parallel, synthesized with contradictions flagged. The default first move for an open question.'],
      ['code-search-campaign', 'Wide-funnel OSS campaign: reason about intent, 3-lane sweep, loop-until-dry. Use when one query will not find everything.'],
      ['foundry-corpus', 'Local read-only corpus: 1.36M repos, transcripts, insights, people graph. Free and instant — try BEFORE hitting the network.'],
      ['chatgpt-deep-research', 'Drives visible ChatGPT Pro / Deep Research via the oracle browser engine. Slow, heavy, use for genuine depth.'],
      // firecrawl RETIRED 2026-07-31 — dangling symlink, package uninstalled, empty API key.
      // Use WebFetch/WebSearch (built in) or /multisearch instead.
      ['insights-ask', 'Query the mined session-extract insights in the spine DB by importance or dimension.'],
      // brain RETIRED 2026-07-31 — corpus is 218k rows but dedup is inert, entries restate
      // events rather than encoding lessons, no project scoping, and `siso-brain ask` returns
      // empty for terms known to be present. Deterministic pb-* routing replaces its job.
      ['source-reference', "Pull a package's or repo's REAL source into local context so you read actual code instead of guessing at an API."],
      ['analyzing-video', 'Frame extraction, scene detection, transcription — for video sources.'],
      ['property-engine', 'UK property Moneyball engine — gems, comps, signals, re-scoring.'],
    ],
  },
  {
    slug: 'pb-orchestration',
    title: 'Orchestration & Sub-agent Dispatch',
    useWhen:
      'running work across more than one agent — fanning out parallel workers, picking a model/lane, ' +
      'driving herdr panes, pairing with Codex, or handing a long task between sessions.',
    triggers: [
      'fan out', 'in parallel', 'spawn workers', 'dispatch', 'run this across',
      'which model should', 'set up a fleet', 'pair on this', 'hand this off',
      'audit/sweep everything', 'check all of these',
    ],
    members: [
      // Ordered by SCALE — one worker, then a session, then a whole project. The overlap between
      // fan-out / conduct / orchestrate is real; it is resolved by how LONG the work lives.
      ['subagents', 'THE routing table: which engine for which job, compact-return prompting, when NOT to delegate. Read this first — it decides everything below.'],
      ['model-routing', 'Benchmark-calibrated capability matrix for the fleet. NOTE: references GPT-5.5 — superseded by gpt-5.6-sol.'],
      ['herdr', 'Pane mechanics — spawn, address, read peers, hygiene laws, the send-verify-Enter pattern.'],
      ['agent-comms', 'How any agent (including weak workers) talks to peers and actually gets the message submitted.'],
      ['conduct', 'ONE SESSION run as a fleet: recon, decompose, dispatch, converge, verify. The step up from fan-out when the work needs several waves and a synthesis rung — but still ends when the session does.'],
      ['orchestrate', 'A WHOLE PROJECT outliving the session: one Opus driving persistent herdr panes with a task list and status contracts. Use when workers must survive a restart.'],
      ['pi-dispatch', 'Lean headless MiniMax lane for bulk read/classify/verify jobs — far cheaper input tokens.'],
      ['haiku-dispatch', 'Headless MiniMax worker for read-heavy bounded jobs. One worker = one bounded job; decompose at the caller, never tell a worker to self-spawn.'],
      ['codex-companion', 'Split your pane and pair with a Codex sibling. NOTE: hardcodes gpt-5.5, needs updating to gpt-5.6-sol.'],
      ['iso', 'Isolated worktree pipeline: recon, synth, build, verify, land.'],
      ['task', 'Durable shared brain for work spanning sessions or agents. Start one before multi-session builds.'],
      ['session-checkpoint', 'Write/read checkpoints and run a verified live handoff to a fresh agent.'],
      ['telemetry', 'Lane health, token spend, tokens-per-delivered-task. Check BEFORE a big fan-out.'],
      ['oracle-loop-manager', 'Standing loop-manager behaviour for autonomous /loop ticks.'],
    ],
  },
  {
    slug: 'pb-codenav',
    title: 'Code Navigation & Codebase Understanding',
    useWhen:
      'exploring an unfamiliar codebase, finding where something lives, tracing callers, ' +
      'or building a structural map before changing code. SERENA FIRST for anything symbol-shaped — ' +
      'it returns structure instead of matching lines and costs a fraction of grep.',
    triggers: [
      'where does X live', 'what depends on', 'find the function', 'trace this call',
      'explain this subsystem', 'map the codebase', 'scan the project', 'who calls',
    ],
    members: [
      // The four code-search skills are ordered by SCOPE — local tree, then one repo, then all public code.
      // Pick by WHERE the code lives, not by which tool you know. They do not overlap if you read this order.
      ['unified-code-search', 'YOUR working tree. Auto-picks rg / fd / ast-grep / ctags by query shape. Prefer Serena MCP first for symbols (find_symbol, find_referencing_symbols) — it returns structure, not matching lines.'],
      ['source-reference', "ONE known dependency you need to read properly. Fetches the package's or repo's REAL source into the workspace so you read actual code instead of guessing at an API. Use when you know WHICH library."],
      ['gitsearch', 'ONE quick `gh search` for repos / code / issues / PRs. Thin wrapper, fastest path when you just need a few examples. gh is installed and authenticated. For anything broader, use sourcegraph instead — gh search rate-limits and misses code-pattern detail.'],
      ['sourcegraph', 'ALL public code across GitHub/GitLab/Bitbucket, plus NPM package metadata. The wide net for ecosystem discovery and cross-repo patterns. Slower than gitsearch but far more thorough — use when one repo will not answer it.'],
      ['siso-codex', 'Emit compressed .siso-wiki/ indexes so agents read ~500 tokens instead of grepping ~50K.'],
      ['graphify', 'Any input to a knowledge graph with clustered communities and an audit report.'],
      ['agent-architecture', 'Lay out a repo so a cold-pickup agent gets O(1) orientation — and enforce it against rot.'],
      ['dedup-primitive', 'Read BEFORE collapsing duplicated helpers into one canonical copy.'],
    ],
  },
  {
    slug: 'pb-verification',
    title: 'Verification, Proof & Adversarial Review',
    useWhen:
      'confirming a change actually works, proving a claim before stating it, reviewing a diff, ' +
      'or classifying files before anything destructive.',
    triggers: [
      'verify', 'is this right', 'prove it', 'review this', 'check my work',
      'did it actually work', 'before I delete', 'are you sure', 'test this',
    ],
    members: [
      ['adversary', 'Flips an agent from confirm-mode to search-mode via adversarial premises. Use when you need something genuinely attacked.'],
      ['falsifiable-investigation', 'One falsifiable hypothesis per read-only worker; demands primary + contradicting + negative evidence.'],
      ['async-codex-review', 'Fire-and-forget background Codex review while you keep working.'],
      ['playwright-cli', 'Drive a real browser headlessly — navigate, click, screenshot, assert.'],
      ['safe-prompt-rewriter', 'Make a legitimate request clear and explicitly authorized, or refuse it.'],
    ],
  },
  {
    slug: 'pb-frontend',
    title: 'Frontend, UI & Visual Design',
    useWhen:
      'building or iterating on an interface — design exploration, UI critique against evidence, ' +
      'cloning a reference site, or making a frontend verifiable by an agent.',
    triggers: [
      'design this page', 'make it look', 'UI/UX', 'clone this site', 'redesign',
      'animation ideas', 'is this accessible', 'design directions', 'frontend',
    ],
    members: [
      ['ui-science', 'Check UI/CSS against science-grounded contracts; every rule carries its human-measurement receipt.'],
      ['design-directions', 'Diverge before committing — generate N genuinely different visual directions from a brief.'],
      ['page-deep-dive', 'Slow 6-phase page analysis SOP that grounds ideation against real code and siblings.'],
      ['clone-website', 'Reverse-engineer a site in one shot — assets, CSS, content.'],
      ['verifiable-frontend', 'Emit data-verify-* DOM contracts so an agent can check the UI at runtime.'],
    ],
  },
  {
    slug: 'pb-system',
    title: 'Agent System, Memory & Self-Improvement',
    useWhen:
      'working on the agent system itself — improving skills, mining lessons from transcripts, ' +
      'checking fleet instruments, or housekeeping the machine.',
    triggers: [
      'improve the skills', 'what did we learn', 'mine the transcripts', 'make the agent better',
      'clean the laptop', 'disk full', 'update the catalog', 'iterate on this skill',
    ],
    members: [
      ['forge-skill', 'Closed improvement loop for a skill or subsystem: mine SOTA, attack, select, apply, review, record.'],
      ['flywheel', 'One full self-improvement round: harvest transcripts, rank failure classes, diff against counter-measures.'],
      ['legibility-floor', 'Harvest JSONL transcripts to make the agent ecosystem legible to one reader.'],
      ['skills-catalog', 'On-demand catalog of all skills with one-line whens.'],
      ['checkmark', 'Sweep the session and write an HTML report of what was actually observed done — end-of-session receipt.'],
      ['runtime-reminders', 'Short event-scoped reminders when runtime state changes (lane, model, permissions).'],
      ['headroom', 'Reversible loopback-only sidecar for measuring context compaction.'],
      ['disk-cleanup', 'Reclaim MacBook disk without losing code.'],
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
function findSkill(name) {
  for (const root of ROOTS) {
    const p = join(root, name, 'SKILL.md');
    if (existsSync(p)) return p;
  }
  return null;
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { fm: '', body: text, raw: '' };
  return { fm: m[1], body: text.slice(m[0].length), raw: m[0] };
}

function isRetired(text) {
  return /^status:\s*retired/m.test(parseFrontmatter(text).fm);
}

function inventory() {
  const found = new Map();
  for (const root of ROOTS) {
    if (!existsSync(root)) continue;
    for (const d of readdirSync(root, { withFileTypes: true })) {
      const p = join(root, d.name, 'SKILL.md');
      if (!existsSync(p)) continue;
      if (found.has(d.name)) continue; // first root wins
      const text = readFileSync(p, 'utf8');
      found.set(d.name, { name: d.name, path: p, text, retired: isRetired(text) });
    }
  }
  return found;
}

// Prepended to the code-navigation router. Serena is the house default for symbol work:
// it returns symbols and their locations instead of every matching line, so it is both
// cheaper and more structured than grep. The serena-nudge PreToolUse hook urges the same
// thing at the tool boundary; this states it at the routing boundary.
const SERENA_FIRST = `
## Reach for Serena before anything else here

For any **symbol-shaped** question — where is this defined, who calls it, what does this
file contain, what breaks if I change this — use Serena, not grep:

| You want | Serena call |
|----------|-------------|
| Find a symbol | \`find_symbol\` with \`name_path_pattern\` |
| Outline a file | \`get_symbols_overview\` |
| Find callers | \`find_referencing_symbols\` with \`name_path\` + \`relative_path\` |

Native MCP: \`query_project\` with the repo's absolute root, a read-only Serena tool name,
and that tool's args as \`tool_params_json\`. Never \`activate_project\` on the shared endpoint.
Runtimes without native MCP use \`~/bin/serena-fast\` from inside the repo.
Scope pattern searches to the narrowest useful \`relative_path\`.

Grep is the fallback, not the default — correct for raw text (comments, strings, logs,
config, non-code files) or a worktree Serena has not indexed. Falling back to grep only
because a Serena transport erred is wrong: retry native MCP first.
`;

function buildPlaybookBody(cluster, resolved) {
  const rows = resolved
    .map(([n, why]) => `| \`/${n}\` | ${why} |`)
    .join('\n');
  return `# ${cluster.title}

**Use when:** ${cluster.useWhen}
${cluster.slug === 'pb-codenav' ? SERENA_FIRST : ''}

This is a **router**, not a runbook. Pick the skill below, invoke it by name, and its
full instructions load then — not before. If two look similar, read the "why" column;
it says what distinguishes them.

## Skills in this cluster

| Skill | When it's the right one |
|-------|-------------------------|
${rows}

## Triggers that should bring you here

${cluster.triggers.map((t) => `- "${t}"`).join('\n')}

## If nothing fits

Fall back to the general pattern: scout cheaply first, delegate bulk reading to a
Haiku/MiniMax worker with a CONSTRAINTS / RETURN / STOP contract, and keep judgment
in the main thread. See \`/subagents\` for the routing table.

---
*Generated by \`scripts/build-playbooks.mjs\` from the live skill inventory.
Do not hand-edit — re-run the generator instead, or it will rot like maps/SKILLS.html did.*
`;
}

function main() {
  const inv = inventory();
  const live = [...inv.values()].filter((s) => !s.retired);
  const retired = [...inv.values()].filter((s) => s.retired);

  console.log(`inventory: ${inv.size} skills on disk — ${live.length} live, ${retired.length} retired`);
  console.log(`mode: ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`);

  const clustered = new Set();
  const plan = [];

  for (const c of CLUSTERS) {
    const resolved = [];
    const missing = [];
    for (const [n, why] of c.members) {
      const s = inv.get(n);
      if (!s) { missing.push(`${n} (not on disk)`); continue; }
      if (s.retired) { missing.push(`${n} (retired)`); continue; }
      resolved.push([n, why]);
      clustered.add(n);
    }
    plan.push({ cluster: c, resolved, missing });
    console.log(`${c.slug}: ${resolved.length} members` + (missing.length ? `  DROPPED: ${missing.join(', ')}` : ''));
  }

  const reflexes = live.filter((s) => REFLEXES.has(s.name)).map((s) => s.name);
  // pb-* are the generated routers themselves — they are tier 1 by construction, not orphans.
  const orphans = live
    .filter((s) => !clustered.has(s.name) && !REFLEXES.has(s.name) && !s.name.startsWith('pb-'))
    .map((s) => s.name);

  console.log(`\ntier 1 reflexes (keep full description): ${reflexes.join(', ')}`);
  console.log(`tier 1 playbooks: ${CLUSTERS.length}`);
  console.log(`tier 2 (description emptied): ${clustered.size}`);
  if (orphans.length) console.log(`ORPHANS (not in any cluster — left untouched): ${orphans.join(', ')}`);

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to write.');
    return;
  }

  // 1. write playbook skills
  const pbRoot = ROOTS[0];
  for (const { cluster, resolved } of plan) {
    const dir = join(pbRoot, cluster.slug);
    mkdirSync(dir, { recursive: true });
    const desc =
      `${cluster.title} — router. Use when: ${cluster.useWhen} ` +
      `Triggers: ${cluster.triggers.slice(0, 6).map((t) => `"${t}"`).join(', ')}. ` +
      `Routes to: ${resolved.map(([n]) => n).join(', ')}.`;
    const fm = `---\nname: ${cluster.slug}\ndescription: ${JSON.stringify(desc)}\n---\n\n`;
    writeFileSync(join(dir, 'SKILL.md'), fm + buildPlaybookBody(cluster, resolved));
    console.log(`  wrote ${cluster.slug}/SKILL.md (desc ${desc.length}ch, ${resolved.length} members)`);
  }

  // 2. demote tier-2: empty the description, keep everything else
  let demoted = 0;
  for (const name of clustered) {
    const s = inv.get(name);
    if (!s) continue;
    const { fm, body, raw } = parseFrontmatter(s.text);
    if (!raw) continue;
    if (/^description:\s*""\s*$/m.test(fm)) continue; // already demoted
    copyFileSync(s.path, `${s.path}.bak-playbooks-${STAMP}`);
    // replace the description line (may be multi-line / folded) with an empty one
    const newFm = fm.replace(/^description:[\s\S]*?(?=^\w[\w-]*:|$)/m, 'description: ""\n');
    writeFileSync(s.path, `---\n${newFm.replace(/\n+$/, '')}\n---\n${body}`);
    demoted++;
  }
  console.log(`\ndemoted ${demoted} skills to tier 2 (backups: *.bak-playbooks-${STAMP})`);
  console.log('done.');
}

main();
