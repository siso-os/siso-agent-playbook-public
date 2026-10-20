# Efficiency owner: useful work per laptop and per token

Use for ongoing ownership of agent runtime, development/build cost and delivery latency. The invoking role supplies its home, authorized repositories, current routing and integrating owners. This playbook does not grant deployment, account or process-interruption authority.

## Continue the programme, not just the benchmark
A small passing patch is a checkpoint. Keep working the ranked PLAN while the goal is active and another safe, useful action exists. A landing awaiting an integrating owner is a dependency for that candidate, not a reason to abandon independent queue/runtime/build work. Record a resumable state before yielding or compacting; do not imply execution continues when its runtime has stopped. Keep one accountable integrating owner and a bounded number of genuinely independent workers. Current user instructions decide whether delegation is allowed.

## Find the actual constraint
Read current PLAN, latest HANDOFF/ledger and unresolved experiment records. Refresh only facts that can have drifted. Separate:
- queue admission/age from command execution and end-to-end completion;
- useful active sessions from wrapper/MCP/test/browser process counts;
- CPU-time work from wall-clock delay, memory pressure/charged footprint from summed RSS;
- cache-cold, cache-warm, changed-source and failed/retried tasks;
- source-reviewed, installed, running and accepted-live evidence.

Rank producers by measured resource work multiplied by frequency and downstream delay. A whole-fleet snapshot locates suspects; a same-workload comparison proves a mechanism. Trace a hot process to its ancestor, command family and source producer. Export metadata only, never private chat or credential-bearing argv. Parse process executable columns separately from full arguments; spaces in app paths and arbitrary prompt text make substring classification unreliable.

## Eliminate work before increasing concurrency
Prefer deleting duplicate checks, retaining compiler graph caches, batching repeated metadata reads, selecting checks from a complete dependency map and coalescing identical in-flight operations. Count the work removed. Do not remove a correctness gate merely because it is expensive. Preserve failure propagation and rebuild inputs; optimistic cache hits that miss a changed source are regressions.

For TypeScript: start with extended diagnostics and native incremental state. Check cache placement per project/worktree, compiler/config/dependency invalidation, imported-package changes and error persistence/recovery. Avoid sharing a writable cache between independent checkouts. For task result reuse, inputs include tracked and untracked source relevant to the command, config, lockfile/tool version and relevant environment; unknown input scope falls back to execution. A successful cache test must include changed/error cases, not just repeated success.

For queues: distinguish admission fairness, scarce-resource scheduling, holds, nested acquisition and child fan-out. Reproduce with harmless short-lived processes and a private state directory before running expensive builds. Preserve limits, lock release on crash, cancellation, exit status/signals, no overtaking after registration and holds established while waiting. Do not fix a blocked nested queue by silently granting unlimited slots. Respect the current slot policy until measured evidence justifies changing it. A successful flock call can acquire a fresh lock; it does not prove inherited ownership. Fail closed on unsupported nesting. Publish persistent coordination state atomically. Assert admission order under the mutex, not payload scheduling across concurrent slots.

For workers/tests: one slot can spawn many processes. Check actual test-runner flags rather than assuming obsolete environment variables enforce limits. Bound independent test-file concurrency and unnecessary per-fixture runtime/browser launches while retaining parallelism that improves accepted throughput. Never stop somebody else's active process to make a benchmark green.

## Execute and integrate
State the hypothesis, exact before baseline, expected work reduction, quality invariant, write ownership and rollback in the existing PLAN. Use one isolated implementation checkout per writer. Check its preparation stage: automatic dependency installation can exhaust the entire launch deadline before the worker starts. Where the installed launcher supports it, explicitly defer only the generated default install for source-only work, retain custom repository setup, and install before dependency-based checks. Do not create replacement worktrees blindly after a preparation failure. Workers return exact source/revision, commands, measurements, failures and next gate to the integrating owner. The owner saves returns and integrates; read-only worker findings are not written or installed changes.

Run the smallest behavioral check that covers the changed contract and its critical failure case, repair ordinary failures, then move. Reuse passed unchanged checks. If the real baseline already exists, use it rather than manufacturing a new benchmark. One decisive real workload pair is preferable to an expensive matrix without a decision. Inspect the producer and consumer: a flag/config/source change is not proof the actual launched process uses it. A checked-build handoff needs independently retained request identity, complete output hashes and exact source identity. Stage into a sibling directory and rename only after verification: a rejected partial index.html must not suppress a remote fallback fetch. Bound both successful and failed temporary output retention.

Land through the authorized owner with an exact commit/patch, bounded evidence, rollout/rollback and primary numbers. Verify the pull record exists. Read later acceptance without pinging. If live promotion is outside your authority, continue another independent high-impact item and retain that exact gate.

## Learn while using this playbook
Append one structured entry per material experiment to the existing ledger: timestamp, playbook revision, hypothesis, workload/source revision, before/after, attempts and failures, changed paths, decision, evidence and next gate. Preserve failed attempts; no cherry-picked after-only result. Record forecast versus actual and why it missed. Keep a short list of reusable errors in the local binding, with the evidence that corrected each assumption. Change this playbook only when a demonstrated failure changes a future decision; do not accrete generic checklists.

At a checkpoint, current PLAN/HANDOFF must tell a cold owner: what actually changed, what is running versus pending, child ownership/return paths, the next actionable bottleneck and its acceptance probe, which evidence not to repeat, and how to roll back. Update HANDOFF last. A report is state for the next cycle, not programme completion.

## Research worth reusing
- TypeScript incremental graph state and explicit build-info location: https://www.typescriptlang.org/tsconfig/incremental.html
- TypeScript profiling and project-structure guidance: https://github.com/microsoft/TypeScript/wiki/Performance
- Vitest v3 worker mechanisms and isolation: https://v3.vitest.dev/guide/parallelism
- Node test runner concurrency controls: https://nodejs.org/api/cli.html#--test-concurrency
- Task-cache correctness requires complete inputs and outputs: https://turborepo.dev/docs/crafting-your-repository/caching

Use the principles with existing tools first. Installing a new build framework or service requires a measured benefit over the existing stack.
