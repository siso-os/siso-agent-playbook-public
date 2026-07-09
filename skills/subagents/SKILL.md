---
name: subagents
description: How to run sub-agents in the SISO stack — which engine for which job (Claude Agent tool, Haiku→MiniMax, headless Codex via /codex:rescue), how to prompt for compact returns, when NOT to delegate. AUTO-TRIGGER at the start of any multi-step task when Shaan describes work without naming a lane: go through/extract/mine/collate, research/look into, refactor/fix/build a feature, review/check/verify, audit/sweep the codebase, explain a subsystem. Load when spinning up workers, fanning out, or choosing a dispatch lane. (Absorbed orchestration-playbook 2026-07-03 — the scenario-routing table + doctrine invariants + dispatch contract live below as "Scenario recipes".)
---

# Sub-agents — the SISO playbook

Operator's manual for delegating work. The *why* (preserve main-thread context, delegate bulk reads) lives in CLAUDE.md § Context Discipline. This is the *how*: pick the lane, prompt it right, don't overdo it.

## The three lanes

| Lane | How to invoke | Routes to | Cost / speed | Use for |
|---|---|---|---|---|
| **Claude sub-agent** | built-in `Agent` tool, `subagent_type` + `model: opus` | Opus → Claude (Max plan) | normal | heavy reasoning, taste, orchestration — only what genuinely needs Opus |
| **Haiku sub-agent** | `Agent` tool with `model: haiku` | **MiniMax** (auto-routed by local Bifrost) | cheap, fast | research fan-out, verification, bulk mechanical edits, multi-turn execution, "check N things" — the DEFAULT worker |
| **Codex investigate** | `/codex:rescue` (say "spark" for fast) | Codex | — | "go figure out X", explicit fix requests, adversarial review |
| **Headless MiniMax batch** | `haiku-dispatch <slug> <brief>` (fail-loud DONE/BLOCKED handoff) or `~/bin/mini-headless` (inline PASS/FAIL verdict, brief-lint gated) | MiniMax direct (`claude-mini -p`) | cheapest load — process exits with the job | fire-and-forget bounded jobs, verification fan-out, overnight batches. **The low-load default** (GQ-002, 2026-07-10) |
| **MiniMax herdr pane** | `~/bin/mini-task --brief <file>` (spawns fresh → lints → runs → captures → **closes itself**) | MiniMax direct, visible pane | heavier (interactive CLI alive) | ONLY when a human needs to watch live. Never reuse a pane across tasks (Shaan 2026-07-10: reset after every main task) |

Haiku → MiniMax is **automatic** — just set `model: haiku` on the Agent call, no special command.

**Before any wave, 5 seconds:** `cat "$WORKSPACE/.agents/telemetry/LANE-HEALTH.json"` — lanes not `UP` → BLOCKED, don't fire silent corpses (07-10: a dead lane killed 6/6 dispatches at 0 tokens, no error surfaced). Same file shows MiniMax budget headroom — the lane now has a **$25/day budget + 150M-token/day rate limit** (Bifrost governance, live since 2026-07-10), so a mid-wave `rate limit` error may be the budget doing its job, not an outage.

**Saturate, don't burst.** MiniMax throttles at ~5-6 concurrent (upstream plan cap, measured 2026-07-02) — a 20-at-once wave just queues and stalls. Keep 5-6 slots *continuously* busy across the whole session instead of firing bursts. In Workflow scripts prefer `pipeline()` over `parallel()` so Haiku stages drain steadily. This is a saturation target, not a burst cap: the MiniMax plan is wildly under-used, so at 2×+ today's volume the right move is a steadier stream, not a bigger wave.

**NEVER spawn a Sonnet sub-agent** (Shaan directive 2026-06-11: MiniMax M3 benches higher than Sonnet — the ban is hook-enforced by `deterministic-guards.mjs` (Sonnet+Fable dispatch ban); `no-fable-subagents.mjs` separately bans Fable incl. model-inheritance). Everything mechanical/bulk/iterative → Haiku/MiniMax; taste/judgment/orchestration → Opus. There is no Sonnet tier here.

## Choosing a lane (decision order)

**For non-trivial routing calls, load the `model-routing` skill first** — the benchmark-calibrated capability matrix (Fable #1 intelligence · Opus = SWE-Bench-Pro champion for repo-judgment coding · Codex/Sol = Terminal-Bench champion for mechanical grind · M3 = #1 open-weights bulk tier) + the confidence-based escalation ladder. The order below is the quick default.

1. **Needs heavy reasoning / taste / orchestration?** → Claude `Agent` with `model: opus` (only if it genuinely needs Opus — most work does not).
2. **Bulk, mechanical, iterative, or "read this and extract X"?** → Haiku sub-agent (cheap MiniMax) — the default. Fan out in parallel for breadth.
3. **Fast code/edit dispatch, second opinion, or hard investigation?** → `/codex:rescue`.
4. **Want something refuted / hard-reviewed before you ship?** → `/codex:rescue` with explicit adversarial framing.

## The five standing Haiku roles (reflexive defaults, not options)

Because MiniMax is abundant and under-used, these are things you spin up *by default*, not when you remember to. Each adds independent signal, so more workers keep paying off:
1. **SCOUT before every build task.** A Haiku `oracle-scout` writes the file/dep/existing-work map to disk; every downstream worker READs it and never re-explores.
2. **VERIFIER after every done-claim.** A Haiku probes the named verification surface before any "done" reaches Shaan (pairs with the warn-mode verify-gate). See *Verify, don't trust* below.
3. **BOOKKEEPER at milestones.** A Haiku keeps task brains/ledgers fresh (decision / learning / trap / tested result), which keeps the spine-echo index hot. Fire at milestones, not every turn.
4. **N-VERSION VOTING for mechanical builds.** 2-3 isolated Haiku attempts at the same spec — agreement = correct. Cheaper than one Codex when Codex budget is scarce.
5. **DAILY MICRO-RETRO.** A Haiku mines yesterday's transcripts for corrections / asks / re-derivations / false-dones.

**Economies-of-scale test (before any >6-agent wave).** Haiku fan-out *pays* when marginal value is flat-or-rising — verification, recon, voting, bookkeeping each add independent signal. It *burns* when workers each re-pay context (no shared disk artifact) or when there is no convergence rung. So before a big wave, name two things out loud: the **disk artifact** the workers share (PERSIST-TO-DISK, above) and the **convergence step** that folds them. The fan-out budget hook warns at 12 for exactly this.

## Claude Agent tool — the essentials

```
Agent(subagent_type=<type>, model=<haiku|opus>, prompt=<task + return contract>)
```

- **Custom types** (in `~/.claude/agents/`): `researcher` (recon, no writes), `verifier` (test → PASS/FAIL), `worker` (execute one phase), `planner` (plans, read/write only). Otherwise `general-purpose`.
- **One task per worker.** Don't hand a worker three jobs; spawn three workers.
- **Parallelize independent work** — send multiple Agent calls in one turn. See `superpowers:dispatching-parallel-agents` for parallel-dispatch theory.

## Prompt for compact returns (non-negotiable)

A sub-agent's final message is the ONLY thing that re-enters your context. A verbose worker defeats the whole point. End every dispatch with an explicit return contract:

> "Return only: the file:line and a one-sentence cause. No process narration, no raw file dumps, no re-explaining the task."

Give the worker exactly the context it needs — never assume it sees your session. Construct its world.

**Return contract template** — paste this into the worker's prompt so "done" always carries proof:

```
End your work by returning ONLY this block:
status: <done|blocked|failed>
verify_cmd: <the exact command you ran to check the NAMED verification surface>
verify_exit: <its integer exit code>
evidence: <file:line or the last line of real output>
result_path: <where the FULL findings/artifact are written on disk>
```

**PERSIST-TO-DISK.** A worker with non-trivial output writes its FULL findings to a file (`.orchestrate/handoffs/<task>.result.html` pattern, or the task's evidence dir) and returns ONLY the path + a ≤5-line digest. Never let a worker paste a large body back into your context, and never hand a downstream worker a pre-computed conclusion — hand it the PATH so it reads the ground truth itself.

**VERIFICATION SURFACE — name it in the brief BEFORE the work starts.** Every build brief states the surface that proves done: the artifact driven down the changed path (the app reloaded, the live/capture path flowing, the row landing in the DB, the component rendered at the real width). `tsc`-clean or N-tests-green ALONE never clears a UI / capture / live-path change — those are necessary, not sufficient. The worker verifies THAT surface, not its own success report.

## When NOT to delegate

Delegation preserves context but isn't free (spawn cost, round-trip). Do it inline when:
- single-file edit, or reading 1–2 small files
- a sub-10s bash command
- the task is smaller than the prompt it'd take to delegate it

Rule of thumb: if the worker's output is one number or one line you already know how to get, just get it.

## Verify, don't trust — BINDING, mechanically enforced

When a sub-agent reports a finding, treat it as a claim. A confident wrong answer from a cheap worker is the main failure mode of fan-out (live proof 2026-07-02: a Haiku recon reported a branch "18 ahead with unmerged work"; git truth was 0 ahead / 19 behind — direction inverted, would have false-alarmed a working lead session).

Two binding rules, one enforced at dispatch by the `evidence-contract.mjs` PreToolUse hook (denies contract-less cheap-tier recon dispatches):

1. **Receipts in the RETURN.** Every recon/audit prompt's RETURN section carries: "EVIDENCE: every numeric, directional (X ahead/behind Y), existence, or classification claim must be immediately followed by its receipt — the exact command run and the raw output line(s) it produced. Claims without receipts are discarded; unprovable claims are marked UNVERIFIED."
2. **Re-derive the decisive claim.** Before ACTING on any worker finding (messaging a peer, deleting, merging, alarming Shaan), the orchestrator re-runs the single most load-bearing command itself. One command, seconds — vs. a false alarm or a wrong merge.

For findings that will drive irreversible action (deletes, merges, deploys), add an **adversarial verifier**: a second independent Haiku whose only brief is "try to REFUTE these specific claims; return CONFIRMED/REFUTED per claim, each with its receipt".

## Worker branch/worktree lifecycle (self-cleanup is the last step of done)

**SETUP.** Branch off FRESH `origin/main` into your OWN named worktree: `git worktree add -b <task>-<date> ../wt-<task> origin/main`. Never a shared checkout — a shared checkout invites `git reset --hard` from under you and destroys parallel agents.

**WORK + LAND.** Build → gate (tsc + no-src-deletions + tests) → push → merge to main SAME SESSION. A branch that lives hours can't drift; one that lives days collides with everything (lessons 2026-06-18). Big-bang branches are the 50-branch-pile-up disease.

**SELF-CLEANUP (mandatory final step, not optional).** Once your work is confirmed on `main` via `git cherry origin/main <yourbranch>` showing ZERO '+' lines, DELETE your own branch (`git push origin --delete <branch>`) AND remove your own worktree (`git worktree remove <path>`). An agent that landed but did not clean up has NOT finished. A landing without cleanup is the entry-ticket to the next 50-branch pile-up.

**IF BLOCKED / DYING.** Report BLOCKED with your exact branch name + worktree path so the next agent inherits cleanly. Never abandon a half-worktree silently — a stale worktree blocks `git worktree add` on the same path and forces a manual cleanup later.

**LIMIT.** Clean up ONLY your OWN branch/worktree (you know what you created). Never delete others' — that's the lead + the branch-hygiene-gate's job. Cross-cleanup without provenance is how a good agent nukes a peer's in-flight work.

## Dependency
Haiku→MiniMax routing needs the local Bifrost router up (launchd `com.maximhq.bifrost`). **First check `$WORKSPACE/.agents/telemetry/LANE-HEALTH.json`** (refreshed every 10 min by `com.siso.lane-health`) — it distinguishes router-down vs auth-dead vs budget-limited per lane. If Haiku sub-agents error on connect: `launchctl kickstart -k gui/$(id -u)/com.maximhq.bifrost`. Full detail: `~/.claude/reference.html`.

## Scenario recipes (absorbed orchestration-playbook 2026-07-03)

The lane-picking guide above is the *how to dispatch*. This section is the *what recipe for THIS kind of work* — the scenario router that fires at the start of any multi-step task. Shaan voices the goal; you match it to a row, run that recipe.

**This section is a router, not a runbook.** It points at the right recipe + the right companion skill. It is agentic, not a script (Shaan's rule: agents over scripts — agents may *run* scripts, the orchestration layer never *is* one). Read the recipe, then reason.

### The doctrine in 5 lines (the invariants every recipe obeys)

1. **Thin coordinator, fat workers.** You (Opus) hold judgment/routing/synthesis. Domain-context lives in fresh workers, never in you. About to read bulk data into your own head → stop, hand it to a worker.
2. **Haiku→MiniMax is the DEFAULT worker — ~80% of the work.** Not Sonnet. Shaan's law: *"Don't use sonnet agent, use haiku — it links to MiniMax which is probably smarter than sonnet. Opus is just for heavy reasoning."* **Saturate, don't burst:** MiniMax throttles at ~5-6 concurrent (upstream cap) — keep 5-6 slots *continuously* busy across the session rather than firing 20-at-once waves that stall; in Workflow scripts prefer `pipeline()` over `parallel()`. Reflexive Haiku roles (defaults, not options): SCOUT before a build, VERIFIER after a done-claim, BOOKKEEPER at milestones, N-VERSION voting for mechanical builds, daily micro-retro — detail + the economies-of-scale test in the "five standing Haiku roles" section above. Opus reasons + double-checks. **Codex is rationed** (use sparsely); when Codex is dry, port via Haiku-with-verification-gates. **No Codex "workflows" primitive** — high-Q sub-agents only.
3. **PUSH beats PULL.** Every dispatched worker ends by pushing `PASS|FAIL: <one line> + <output path>` back to the coordinator's pane — not just printing to its own. Line 1 is the verdict; you never parse prose. A brain *closes the loop*: dispatch → watch → react → synthesize.
4. **Verify by reading the running artifact, not the docs.** "Done" = observed. Shaan's most-repeated correction: *"look at the code, not the docs."* Verify by reloading the app, not code-reading. Last step before "done" is an independent check.
5. **Never ask for a thumbs-up on subtasks.** *"You don't ever ask me for my thumbs up again for anything."* Decide + announce. Escalate only taste / money / accounts / irreversible.

### Pick the recipe (scenario → how to run it)

| # | Scenario (what Shaan voices) | Recipe | Lane / model | Verify | Compose |
|---|---|---|---|---|---|
| 1 | **Mine / extract / collate** ("go through these transcripts/files and pull X") | Fan out N Haiku miners, one clean source-slice each → Opus synthesizes. Each miner gets CONSTRAINTS/RETURN/STOP. | Haiku→MiniMax ×3-5, Opus synth | Spot-check 1-2 extracted claims vs source | `subagents` |
| 2 | **Research / look into / find out** ("research vendor X / how does Y work") | 1-3 parallel researchers by angle (web / code / docs). Each returns cited findings. Opus adversarially reconciles contradictions. | Haiku→MiniMax researchers | Cross-check contradictions; cite sources | `subagents`, `multisearch`/`deep-research` |
| 3 | **Small refactor / fix a bug / few-file edit** | Do it inline if &lt;~50 lines & 1-2 files. Bug → reproduce with a check FIRST, then fix, then re-run the check. | Inline (you) or 1 Haiku→MiniMax / Codex worker | Reproduce → fix → check passes | `superpowers:systematic-debugging`, `superpowers:test-driven-development` |
| 4 | **Build a feature end-to-end** (multi-file, architectural) | Plan first (Opus/`planner`). Then mechanical build → Codex; taste/judgment calls → you. >3 files or ships to users → Codex review before "done". | Plan: Opus · build: Codex · review: Codex (`/codex:rescue` or a Codex pane — codex-fast is RETIRED) | Run the artifact; Codex adversarial review | `superpowers:writing-plans`, `codex-dispatch`, `subagents` |
| 5 | **Review / check / "is this right"** | Adversarial review of the diff. For anything load-bearing, fire a Codex refuter (`/codex:rescue` or `async-codex-review` — codex-fast is RETIRED) that tries to *break* the claim. | Codex review / Haiku verifiers | Refutation pass, majority-must-survive | `async-codex-review`, `code-review` |
| 6 | **Audit / sweep / map a codebase** ("what the fuck's going on in X") | Fan out read-only Haiku scouts by directory/concern → Opus assembles one map. Strictly read-only; report counts/paths, no edits. | Haiku scouts ×N read-only | Echo the read-only constraint; verify a sample | `subagents`, `siso-codex`, `Explore` agent |
| 7 | **Explain a subsystem** ("what is the office / how does X work") | Dispatch ONE agent to READ the actual code and return a plain-language model (anti-fabrication — read, don't theorize). | 1 Haiku→MiniMax reader | Reader cites file:line, not guesses | `classify-by-reading`, `Explore` |
| 8 | **Run a whole project / standing fleet** (>3 parallel streams, long-lived workers) | Promote to the full orchestrator pattern: persistent herdr panes, agent tree, task list, Codex grinds + Claude judges. | Opus orchestrator + herdr fleet | Status contract per worker (§status of `orchestrate`) | `orchestrate` (policy) + `herdr` (mechanics) |
| 9 | **Pair on one hard thing** (split-brain on the same task) | Split your own pane, launch a Codex sibling, you = left brain (judgment), Codex = right brain (grind), same task. | You + Codex companion | Sibling refutes/confirms before ship | `codex-companion` |

If the work doesn't fit a row: default to recipe #1's shape (fan out cheap, synthesize thin) and pick the model with the **`subagents`** skill (which owns the routing table now) or `~/.claude/reference.html`.

### The dispatch contract (every worker prompt ends with these 3 lines)

```
CONSTRAINTS: <read-only? which files may change? cap N reads?>
RETURN: <literal output shape — line 1 = PASS|FAIL, then evidence, then output path>
STOP: <hard terminator — "STOP after N files/greps; if not found, reply NOT FOUND">
```

Two more contract lines (GQ-002, 2026-07-10):
- **Task-id join:** name the `TASK-NNNN` in the brief when one exists — tokens then join to delivered work in `.agents/telemetry/EFFICIENCY.html` (fleet join rate was 8.7%; unlabeled work is unmeasurable work).
- **One agent = one task, structurally.** Never send a worker a second brief ("continue your lane" is lint-refused). Fresh spawn per task; `mini-task`/`mini-headless` terminate themselves.

Completion — **zero-token await beats polling AND beats pane-push** where possible:

```
# coordinator side: block on the result with no model in the loop
~/bin/herdr-await --file <result-path> --timeout-ms 1800000            # headless workers
~/bin/herdr-await --pane <label> --status idle --notify <mgr> --close  # pane workers (+ the reset)
```

For herdr-pane workers on the Oracle lane, the PUSH LAW stands as the backstop:

```
On completion, report to me: ~/.local/bin/herdr pane run <COORDINATOR_PANE> "PASS|FAIL: <one line> + <output path>"
```

(Re-resolve pane ids every turn — they rotate. `pane run` = atomic type+Enter; multi-line = `pane send-text` then `pane send-keys Enter`, then `pane read` to confirm the box cleared. NEVER model-poll a pane in a loop — that ceremony measured ~4B tokens corpus-wide; `herdr wait` does it for free.)

### Companion skills (this routes INTO them — read for detail)

- **`subagents`** (this file) — the lanes (Claude Agent / Haiku→MiniMax / Codex) + compact-return prompting. The *how to dispatch*.
- **`subagents` + `~/.claude/reference.html` routing table** — which model for which task shape + budget reality. The *how cheap*. (Supersedes the retired `siso-routing` skill.)
- **`orchestrate`** — whole-project herdr fleets (recipe #8). The *how to run many*.
- **`herdr`** — pane/workspace CLI mechanics.
- **`codex-companion`** — split-brain pairing (recipe #9).
- **`codex-dispatch`** — fire headless Codex workers with a gated PASS/FAIL handoff (recipe #4 mechanical build). (Superseded the old `dispatch` plan-runner skill, archived 2026-07-02 — its Haiku/Sonnet worker split predated the Sonnet ban.)
