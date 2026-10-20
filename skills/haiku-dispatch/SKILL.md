---
name: haiku-dispatch
description: Retired compatibility pointer for old Haiku/MiniMax dispatches; use the GPT-5.6 Luna Claude Agent instead.
---

# haiku-dispatch

This skill is retired. MiniMax is not an available lane in the current Claude
setup, and Haiku is not a separate worker tier. Do not invoke the old transport
or its shell wrappers for normal work.

Use the one supported Claude dispatch:

```text
Agent({subagent_type:"gpt-luna", prompt:"one bounded task with evidence and a hard stop"})
```

Do not pass `model: haiku`, `model: minimax`, or any provider name. The Luna
agent owns its model pin. Use `gpt-sol` only for an independent cold review.
Keep the old skill name only so stale prompts fail predictably; if a caller
explicitly requires the retired transport, report BLOCKED rather than routing
to another provider.

For code questions, require Serena first and return compact evidence-backed
results.
