---
name: haiku-dispatch
description: Dispatch one bounded read-heavy job to a fresh headless MiniMax worker with a fail-loud result handoff; use for classification, verification, mining, auditing, and extraction batches.
---

# haiku-dispatch

Headless **MiniMax worker** for **read-heavy bounded** work (classify, verify, mine, audit, extract). Runs `claude-mini -p` (MiniMax M3 — ~unlimited, **$0 to the Opus/Claude plan**) as a background process: NO herdr pane, NO Opus-context pollution, and the process **exits when the job ends** (fresh context per task — nothing accumulates).

> **Rewritten 2026-07-10 (GQ-002).** The old version told every worker to "fan it WIDE" and self-spawn sub-agents — that recursive template was the root mechanism of the 2026-07-09 MiniMax drain (2.27B cache-read in 13h), and after the claude-mini guards landed it made every dispatch die silently. The new law: **one worker = one bounded job; decomposition happens at the CALLER.** You fan out by firing N dispatches, never by telling a worker to multiply.

## When to use which lane
- **haiku-dispatch (this)** — READ / CLASSIFY / VERIFY / MINE / AUDIT, headless, fire-and-forget batches. The default bulk lane. NOT for code that must compile.
- **`~/bin/mini-headless`** — same engine, single supervised unit with a PASS/FAIL verdict + brief-lint gate; use when you want to `wait` on the result inline.
- **`~/bin/mini-task`** — MiniMax in a **herdr pane**, only when a human genuinely needs to watch live; spawns fresh, does one task, closes itself (never reuse a pane across tasks — Shaan directive 2026-07-10).
- **codex-dispatch** — code fixes/codegen that must tsc+test green.

## Before a wave: 10-second lane check
`cat "$WORKSPACE/.agents/telemetry/LANE-HEALTH.json"` — if `minimax_direct`/`haiku_minimax` isn't `UP`, report BLOCKED instead of firing a wave of silent corpses (the 07-10 401 outage killed 6/6 dispatches at 0 tokens with no error surfacing). Budget headroom is in the same file.

## One command
```bash
haiku-dispatch <slug> <prompt-file-or-inline>
```
- handoff → `.orchestrate/handoffs/<slug>.haiku.md`, log → `/tmp/haiku-<slug>.log`.
- The wrapper AUTO-APPENDS: the one-bounded-job law, the evidence-receipt contract (with ABSOLUTE-paths rule — `~` doesn't expand in worker shells), and the DONE/BLOCKED handoff contract. Your prompt is just the task.
- **Task-id join (L0):** put the `TASK-NNNN` id in your prompt when one exists — the wrapper threads it into the handoff so the efficiency rollup can join tokens→delivered work (join rate was 8.7%; every unjoined brief keeps it low).

Parallel batch — the CALLER is the fan-out layer:
```bash
haiku-dispatch audit-a /tmp/p1.txt &
haiku-dispatch audit-b /tmp/p2.txt &
haiku-dispatch audit-c /tmp/p3.txt &
haiku-dispatch-status          # DONE/BLOCKED per handoff
```
Cap ~5-6 concurrent (MiniMax throttles, err 2062); more units → waves.

## Fail-LOUD guarantee (new)
A `BLOCKED` handoff is **always written** — if the worker dies at spawn (guard block, dead key, crash) the wrapper writes `BLOCKED` + the log tail itself. A missing handoff after a few minutes now means exactly one thing: the process is still running. The silent-no-op class is dead.

## Rules
- **One job per dispatch.** Workers never self-fan, never take "next task" follow-ons (fresh-agent-per-task law — context re-sends are the drain).
- **Gate on the handoff file, not process exit** — `claude-mini -p` buffers; the log fills late.
- **Evidence contract:** every count/existence/classification claim carries its receipt or is UNVERIFIED.
- Do NOT use for code that must compile (→ codex-dispatch).

## Files
| Path | Role |
|---|---|
| `SKILL.md` | this |
| `bin/haiku-dispatch` | fire one bounded headless worker (contracts auto-appended, fail-loud handoff) |
| `bin/haiku-dispatch-status` | poll handoffs for DONE/BLOCKED |
