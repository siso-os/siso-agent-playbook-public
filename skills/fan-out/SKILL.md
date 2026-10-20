---
name: fan-out
description: Plan a small parallel wave for genuinely independent units with explicit ownership, compact returns, and one convergence step.
---

# Fan-out

Use parallelism when two or more units are genuinely independent. Keep the wave
bounded, preserve unrelated work, and reserve one parent-owned synthesis step.

## Before dispatch

1. List units and exact read/write ownership.
2. Check live capacity and choose the verifier before spawning.
3. Route each unit through `model-routing`: normal work uses the Claude Agent
   custom subagent `gpt-luna` (or native Codex Luna); deliberate independent
   review uses `gpt-sol`. Do not pass a model override.
4. Give every worker an objective, scope, verification check, return shape, and
   hard stop. Workers never self-fan.

## Return contract

```text
status: done | blocked | failed
result: one sentence
evidence: exact file:line or command output
verify: exact command and exit code
artifact: path when needed
```

For code discovery, require Serena `query_project` first. Do not prescribe broad
shell search commands. Converge the compact returns before opening another wave.
