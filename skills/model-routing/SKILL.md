---
name: model-routing
description: Choose the approved Luna or Sol lane before dispatching work.
---

# Model routing

Route by task shape and verification cost. A model label is not evidence that a
request succeeded.

| Need | Approved lane |
|---|---|
| Any normal Claude sub-agent task (exploration, implementation, tests, or synthesis) | Claude Agent `subagent_type: gpt-luna` |
| Any normal Codex delegated task | Native Codex Luna |
| Independent adversarial review or ship gate | Deliberate Sol reviewer (`gpt-sol`) |
| Tiny local operation | Current agent inline |

Luna is the default work lane. The one normal Claude call is
`Agent({subagent_type:"gpt-luna", prompt:"..."})`; do not pass a model override because
the frontmatter owns the pin. Use `gpt-sol` only when an independent cold review is
actually required. Do not use `model: haiku`, raw provider names, Herdr panes, or
ad-hoc launchers for ordinary Claude delegation. If a lane is unavailable, report
BLOCKED rather than silently substituting another lane.

For code discovery, use Serena `query_project` first and require exact evidence
before accepting a worker claim.
