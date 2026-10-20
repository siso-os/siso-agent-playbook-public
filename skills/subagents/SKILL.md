---
name: subagents
description: Dispatch bounded sub-agents with compact evidence-backed returns — Luna roles in Codex, Claude sub-agents in Claude Code — and keep consequential judgment with the parent.
---

# Sub-agents

Sub-agents are for independent outcomes, not ceremony. Keep consequential scope
and final claims with the parent.

## Choose one lane

- Codex: native `luna_worker` for implementation, testing and bounded bulk work;
  `luna_explorer` for read-only exploration.
- Claude Code: `general-purpose` (or a named project agent) for separable work;
  built-in `Explore`/`Plan` for read-only sweeps. GPT work is not a Claude
  sub-agent: spawn Codex in its own herdr tab instead.
- Independent review: one fresh reviewer only when acceptance criteria, a
  sensitive path or a concrete consequential risk calls for it.
- Inline: one small operation cheaper than dispatch.

## P6 — checkable task tiers

| Work shape | Route | Acceptance condition |
|---|---|---|
| One short lookup, command or small deterministic edit | Inline | Dispatch and review would cost more than the work; run the relevant check |
| Clear independent extraction, scoped implementation or tests | Bounded Luna | Exact owned paths, sufficient source context and a mechanical/semantic check the parent can evaluate |
| Ambiguous intent, conflicting sources, architecture or cross-project tradeoffs | Existing capable owner (Astra/Fable), not another helper tier | Resolve the consequential judgment before delegating a bounded part |
| Consequential release or disputed correctness | Responsible owner plus the intended independent review | Check actual behavior and restrictions; a report/build badge is not acceptance |
| Missing assignment or failed transport | Repair that seam within authority | Do not label it a model-intelligence failure or silently change account/provider |

Native Codex uses `luna_explorer` for read-only work or `luna_worker` for
implementation. Use a context-clean brief when helpful; do not recursively fan
out or create another managerial tier. Owner-tier judgment is not permission to
override the helper routing pins below.

The normal Claude Code call is:

```text
Agent({subagent_type:"general-purpose", prompt:"..."})
```

Claude Code talks directly to Anthropic; every Claude model id is valid there,
and MiniMax is disabled. The `gpt-luna`/`gpt-sol` custom agents and their
routing hook were retired on 2026-09-10, so do not dispatch them.

Before dispatch, define one objective, exact ownership, verification surface, and
hard stop. For code discovery use Serena `query_project` when present, else grep; shell
recursive-search commands are fine when targeted.

Give a compact brief with the existing project entrypoint, constraints and checks,
not the whole parent history or a new documentation structure. Tell the worker it
shares the worktree and must preserve others' edits. Dispatch only when the
bounded outcome justifies boot, briefing and parent review.

For a clear implementation task, use the contract in
`../../prompts/implementer.md`: outcome, owned paths, acceptance, relevant check,
return and completion condition. This is the default working path; scouting and
independent review are conditional tools, not stages every task must traverse.
Continue useful parent work while the worker executes. Keep ordinary repairs with
that worker under the original task; do not restart a fresh scout or review wave.
When using `brief-lint`, a continuation carries matching `TASK` and `CONTINUES`
IDs. A new unrelated task uses a fresh worker.

Verify assignment delivery. If the current adapter replaces the assignment with
a local packet pointer, prepare that exact packet before dispatch and include
follow-up scope changes there. This is a transport-specific workaround, not a
requirement for native messaging that already works. A missing packet is reported
once: no machine-wide search or repeated reads of an unchanged pointer. Resume
when the assignment or route actually changes. Local HTTP200 is not upstream proof.

Let the worker work. Follow up for a material scope change, correction or real
blocker, not routine ACK/status. Keep necessary safety checks, tests and review;
reuse unchanged verified evidence instead of rerunning it to acknowledge a message.

## Return only

```text
status: done | blocked | failed
result: one sentence
evidence: exact file:line or command output
verify: exact command and exit code
artifact: path when larger than five lines
```

Compare the artifact and relevant check results with the acceptance criteria.
Inspect the changed behavior or output; do not duplicate passing checks merely to
acknowledge the return. Use an independent reviewer when the user, project gate,
or a specific unresolved risk requires one. Confidence and process exit alone
are not proof. Once acceptance is met, deliver the result.

## Measure accepted work

Use existing run records and material writebacks, not a new logging framework.
Include parent briefing/review, child boot/context, tools/retries, handoff and
rework. Deduplicate response IDs and retain counter-reset segments. Cached input
is inside total input; reasoning is inside output. Missing attempts or charges
remain unknown, and whole-response phase input is not marginal handoff-text cost.
Report first source access separately from a task-relevant correctness witness.
Count post-dispatch messages separately from initial dispatch and terminal results;
do not invent a pings-per-accepted-outcome denominator from DONE labels. Compare
equivalent accepted outcomes before claiming a gain. Planning allocations are not
quota or permission to spend/reset/buy compute.
