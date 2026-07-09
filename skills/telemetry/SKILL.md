---
name: telemetry
description: "The fleet's instruments — lane health, token spend, tokens-per-delivered-task. Load BEFORE any fan-out/dispatch wave (is the lane UP? budget headroom?), when Shaan asks 'what did the tokens buy / how efficient are we', when a wave fails silently (0-token deaths), or when writing a worker brief (the task-id join contract). Born from GQ-002 (2026-07-10): the estate measured cost everywhere and value nowhere."
---

# telemetry — the fleet's instruments

One home: `$WORKSPACE/.agents/telemetry/` (`WORKSPACE` defaults to `~/SISO_Workspace`).

## The three instruments

| File | What it answers | Freshness |
|---|---|---|
| `LANE-HEALTH.json` | is each lane UP right now? (bifrost, haiku→MiniMax, MiniMax-direct, codex CLI, mini-ssh) + MiniMax budget headroom + the mini's error-state services | every 10 min (launchd `com.siso.lane-health`; flips page via macOS notification + `LANE-HEALTH.log`) |
| `EFFICIENCY.html` / `efficiency.json` | tokens/day by lane · **tokens-per-completed-task** · task-id join rate · reused-session flags · top heavy sessions | on demand: `python3 .agents/telemetry/bin/efficiency-rollup.py` (~6s incremental); nightly plist in `launchd/` (load it to automate) |
| `events/` | herdr-await captures, mini-task/mini-headless verdicts + logs | per event |

## The three reflexes this skill installs

1. **Check before you fan.** `cat .../LANE-HEALTH.json` (5 seconds, zero tokens) before any worker wave. A lane not `UP` → report BLOCKED with the json line — never fire into a dead lane (2026-07-10: 6/6 dispatches died at 0 tokens, silently, on a 401-dead lane).
2. **Label work or it never happened.** Every worker brief carries its `TASK-NNNN`. That's the join key from tokens → delivered work. Baseline shame number (2026-07-10): 8.19B tokens → 2 completed tasks / 7 days, join rate 8.7%. Raising the join rate IS raising measurability.
3. **Re-run the rollup after a big campaign** and read the headline: did tokens-per-task move? This file is the standing regression test for every efficiency change (GQ-002 levers land as paired experiments against it).

## Budget facts (so a limit isn't misread as an outage)
MiniMax Workers key (Bifrost governance, live 2026-07-10): **$25/day budget, 150M tokens/day, 25k req/day**. A `rate limit`/`budget` error mid-wave = the guardrail firing (check `minimax_budget` in LANE-HEALTH.json), not necessarily the plan being drained. The direct `claude-mini` lane bypasses Bifrost but is joined in the rollup + probed by lane-health.

## Extending
New lane → add a probe block to `~/bin/lane-health` + a lane matcher in `bin/efficiency-rollup.py` (see its README.html). Keep one home; don't spawn parallel telemetry dirs.
