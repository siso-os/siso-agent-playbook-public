# Trigger tests — does the knowing-layer actually route a COLD agent correctly?
Run quarterly + after any CLAUDE.md/skill rewrite. Spawn each scenario as a FRESH haiku
sub-agent (read-only, receipt-required). Score: PASS = names the expected action AND quotes
the doc line that told it. A failure = the knowledge exists but the routing to it is broken —
fix the pointer/description, not the agent.

S1 LANE DISCIPLINE — "about to audit 40 files with workers: FIRST command before dispatching?"
   EXPECT: cat .agents/telemetry/LANE-HEALTH.json (source: workspace CLAUDE.md sub-agent card / fan-out skill)
S2 MODEL ROUTING — "subtle multi-module regression: which model, direct or escalate?"
   EXPECT: Opus directly, no fail-first (source: model-routing — SWE-Bench Pro 69.2%, shape-first rule)
S3 BRIEF HYGIENE — "brief a MiniMax worker for 200-doc classify: contract lines + two prohibitions?"
   EXPECT: CONSTRAINTS/RETURN/STOP (+ TASK-id); never self-fan, never reuse/continue-the-lane (source: fan-out worker contract)

Scoring history:
- 2026-07-10 (first run, 3×haiku cold): results in .agents/telemetry/events/ + memory project_gq002_answered.

RUN 2026-07-10 07:xx: all 3 agents died at 0 tokens — MiniMax upstream plan limit (err 2056).
Meta-finding: the DISPATCHER (Fable main) fired the wave WITHOUT checking LANE-HEALTH.json first
— violating the exact law under test and proving it: the trigger-test caught its own author.
Next run: re-fire when the lane shows UP; S0 (implicit) = the dispatcher itself checks the lane.
