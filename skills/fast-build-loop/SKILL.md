---
name: fast-build-loop
description: How a product owner (one Opus integrator) drives up to 12 Sol builders to finish a product fast - lanes, a 20-minute merge train, deploy the last green SHA, bisect a red head, affected tests, builders prove before merging, minutes lost per stage. Load it when you own a product and have more than three rows to ship.
---

# Fast build loop: one integrator, many builders

Source: `~/SISO_Workspace/_data/people-graph-research/2026-10-16-how-labs-build/PRINCIPLES.md`
(sections 3, 4, 7, 8, 14; how Anthropic's Scion team and OpenAI ship). Written 16 Oct 2026, after a day
when HALO had merged 54 PRs while DEV sat 3 hours on one SHA and only 2 builders were running.
Building is rarely the bottleneck. Integration, CI and deploy are.

## Roles

- **You (the owner, Opus): the integrator only.** You cut rows into jobs, launch builders, merge trains,
  promote to DEV and keep the record. You write no feature code.
- **Builders: Sol** (`delegate_task`, codex `gpt-6.1-sol`, Fast tier), one row each, run async.
  Keep **10-12 running** whenever open rows exist (P7). When one returns, launch the next before
  you do anything else. A parent that has gone idle while rows are open is the failure this skill exists to prevent.
- One writer per shared component. Before a second builder touches the same files, write down the interface
  between them and the check that proves they integrate (P7).

## Lanes (rename them for your product)

| Lane | Builders | Job |
|---|---|---|
| A: green head | 1-2 | Keep main deployable: bisect a red head, fix it or revert it by PR, and own CI speed (affected + sharded tests). |
| B: proofs | 2-3 | Prove merged rows on DEV against its live SHA, then flip them in the ledger. |
| C: rows | 5-6 | Open or partial rows, one PR each. |
| D: drills | 1-2 | Box-only or ops drills, run on the real box. |

## The brief every builder gets (P7, P8)

Row id and the outcome in one sentence · the files it owns · the branch · **the check it must pass before
opening the PR** (affected tests plus the row's own probe, run in its own worktree with isolated ports and
state) · a cost/attempt bound · the return shape: `status, PR, merge-ready yes/no, check + exit code, minutes per stage`.
A builder proves its own row. "CI will tell us" is not a check.

## Merge and deploy (P3, P4)

1. **Train every 20 minutes:** merge every merge-ready PR together, then run **one full CI on the train head**.
   Per PR, run only affected tests (changed packages plus dependents; unknown means full). Nightly runs the full suite.
2. **Deploy the last green SHA, never the head.** DEV moves forward whenever any newer commit is green.
   A red head does not hold DEV back and does not stop merging.
3. **A red train is bisected right away** (Lane A): find the culprit, fix or revert it by PR, and keep the later good
   commits. Record the failed SHA, the last green SHA, the failing check, the action taken and the new deployable SHA.
   An unsafe revert, a migration or an unclear culprit pauses promotion, and you decide.
4. A flaky or slow test is a Lane A row, not a reason to wait. Shard it or fix it.

## When Codex runs out

The gate decides, not the model: a PR merges only on its own affected tests plus the train's full run. Any builder
can therefore ship, as long as its row is cut small enough to match it:
- **Sol / Sonnet 5.5:** cross-file rows, unclear bugs, Lane A.
- **Haiku 5.5, `deepseek-worker`, `qwen-worker`:** one-file or one-component rows that come with a written check (a test
  to make pass, a probe to make green). More, smaller rows; you spend the time cutting them.
- A row that fails its check twice moves up one model. Never loosen the check to let a cheaper model through.

## The record (P14)

`<product>/.agents/BUILDERS-NOW.md`, rewritten at every train:
`row | builder taskId | branch/PR | state | minutes lost: setup / CI wait / integration / deploy / proof`.
Add up the minutes lost per stage every hour. The biggest number becomes Lane A's next job.

## Reporting progress

Count from git and DEV, never from the ledger alone. Report: PRs merged today, DEV's live SHA and its
time, PRs merged but not on DEV, builders running (X of 12), and critical rows proven on DEV (X of Y).
The ledger lags. A row is only done once it is proven on DEV.

## Stop rules

Stop only when every critical row is proven on DEV, or when the only thing left is Shaan's phone code, face or
card (send one link). Otherwise the loop runs without asking, and you report once at the goal.
