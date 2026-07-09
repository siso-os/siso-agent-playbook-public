---
name: fan-out
description: "Install the aggressive parallel fan-out reflex. Fires the instant a task contains ≥2 independent units — trigger phrases: 'N files to check', 'audit', 'sweep', 'for each', 'across all', 'check every', 'go through', 'fix the failing tests', 'research these questions', any list of things that don't depend on each other. Use to STOP serial grinding, under-filled worker pools, and worker-babysitting."
---

# Fan-Out

You under-parallelize by default. Every agent in this system does — 1-2 workers where 5-6 should run, serial grinding, idle polling. This skill overrides that.

## The trigger test (run at task start, every task)

1. List the independent units of work — files, tests, questions, targets, whatever repeats.
2. Count them. **≥2 independent units → fan out NOW.** No permission, no "let me do one first to see." Dispatch is the first action, not the last resort.
3. Independent = unit B doesn't need unit A's output. Most "sequential" work is actually independent and you assumed otherwise — check before serializing.
4. Scout ≤30s before a heavy wave (auth works? target exists in scope?) — then dispatch.
5. **Lane check first (mechanical, free):** `cat "$WORKSPACE/.agents/telemetry/LANE-HEALTH.json"`. Lane not `UP` → report BLOCKED, don't fire a wave of silent 0-token corpses (2026-07-10: a dead haiku lane killed 6/6 dispatches with no error surfaced). Budget headroom is in the same file.
6. **Load check:** if `uptime` load is several × core count (e.g. >30 on this laptop), halve the wave and prefer headless workers — a 663-process pileup at load 230+ was fleet self-harm, not throughput.

## Wave dispatch (saturate the pipeline)

- One worker per unit (or per small shard), up to **~6 concurrent**. That's the cap, not the target — **fill it**.
- More units than slots → waves. **The moment one worker returns, dispatch the next queued unit — before processing the result you just got.** No slot sits empty while units wait.
- Don't fire 20+ at once (workers throttle past ~5-6 concurrent) — stagger waves.

## Never babysit

- **Every worker: `run_in_background: true`. Always.** The harness re-invokes you when a worker finishes — you never poll, sleep-loop, or watch.
- Polling an already-tracked background worker is a named anti-pattern. Caught yourself checking on one? Stop.
- While workers run, the main thread keeps working: dispatch the next wave, answer the user, synthesize returns already in. Idle waiting is waste.

## Worker prompt contract (every worker, every time)

End every worker prompt with three literal lines:

```
CONSTRAINTS: <read-only, OR the exact files this worker may change — nothing else>
RETURN: <exact compact output shape — e.g. "file:line + one-sentence cause. No narration, no raw dumps.">
STOP: <hard bound — e.g. "after 5 files / 8 greps, emit verdict from what you have; if not found reply NOT FOUND">
```

No STOP line → the worker grinds 19 turns chasing nothing. Bound every worker.

Plus two lines that make the work MEASURABLE and SAFE:
- **Task-id join (L0):** if the work belongs to a `TASK-NNNN`, name it in the brief — that's how tokens join to delivered work in `.agents/telemetry/EFFICIENCY.html` (join rate was 8.7%; unlabeled briefs keep the fleet unmeasurable).
- **Workers never self-fan.** Decomposition happens HERE, at the dispatcher — a worker told to "fan wide" was the 2026-07-09 drain mechanism and is now guard-blocked on the MiniMax lane.

## Tier rule (baked in)

- **Bulk / mechanical / read / grep / count / extract / transform → `model: haiku`** (auto-routes to MiniMax: cheap, effectively unlimited). Under-using the unlimited tier while burning the scarce one is the exact waste this skill kills.
- **Judgment / synthesis / taste / the final call → main thread (Opus-grade).** Workers produce; you decide.
- **Sonnet workers are banned.** Never spawn one.

## Transport rule (which body the worker gets)

- **In-turn scouts/verifies** → Agent tool (`model: haiku`, `run_in_background: true`) — harness notifies on completion.
- **Fire-and-forget batches** → `haiku-dispatch <slug> <brief>` (headless, fail-loud DONE/BLOCKED handoff) or `~/bin/mini-headless` when you want an inline PASS/FAIL verdict. **Headless is the low-load default** — the process exits with the job.
- **Watch-live only** → `~/bin/mini-task` (herdr pane; spawns fresh, one task, closes itself). Panes are for human eyes, not for transport — and NEVER reuse one across tasks.

## Absorb compactly, then converge

- Read only each worker's typed RETURN. Never re-read the full artifact a worker already summarized — grep/head/windowed-Read if you need more, never `cat` it into the main thread.
- Fan-out earns its cost at the synthesis rung: fold N compact returns into ONE result before dispatching further waves. Accumulating workers with no convergence step is sprawl, not parallelism.

## Anti-patterns (all forbidden)

| Anti-pattern | Looks like | Do instead |
|---|---|---|
| Serial grind | Handling unit 1, then 2, then 3 inline | List units, dispatch a wave |
| Poll-loop babysitting | `sleep`/re-check a background worker | Harness notifies; orchestrate meanwhile |
| One mega-agent | A single worker told "do all 60" | One worker per unit/shard, capped waves |
| Under-filled cap | 2 workers running, 6 units queued | Fill the cap, then wave |
| Delegate-then-reread | Worker summarized; you `cat` the full file | Read only the RETURN block |
| Asking to fan out | "Should I run these in parallel?" | Dispatch — it's the default |

## 10-second self-check (run mid-task)

**"Am I doing the 3rd similar step inline?"** Two of a kind by hand and reaching for a third → stop. Batch the remaining units and fan them out. Three-in-a-row inline means you missed the trigger at task start; recover by fanning out the rest right now.

## Worked micro-example

"Audit 60 files" → 60 units → shard 6 workers × 10 files, `model: haiku`, background.
Each prompt ends: `CONSTRAINTS: read-only. RETURN: only "path:line — <violation>" per hit, no narration. STOP: after your 10 files, emit hits from what you read.`
As each hit-list returns, append to the tally; all 6 back → synthesize once. Main thread never read a file.
