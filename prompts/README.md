# Prompt Bank

For a clear implementation request, start with [implementer.md](implementer.md).
Fill the outcome, owned paths, acceptance and relevant check; then let the worker finish.
Use the installed `subagents` skill for the current transport and model routing.

| Brief | Use when |
|---|---|
| implementer | One requested change or artifact needs completing |
| scout | A specific unanswered question blocks implementation |
| verifier | An independent check is requested, required, or justified by a concrete risk |
| refuter | A consequential or disputed decision needs counter-evidence |
| nversion-builder | Comparing independent implementations is explicitly part of the task |
| miner | Independent source slices need extraction |
| bookkeeper | A material outcome needs recording in the existing project state |

These are alternatives, not mandatory stages. The owner accepts actual outcomes using
appropriate evidence. A passing build alone does not prove interaction behavior; nonvisual
work does not need a screenshot. Do not reopen passing checks without a change or unresolved
concern. Preserve project-specific release and sensitive-change requirements.

Repairs stay with the same worker and task. For a continuation brief, carry the original
`TASK: <id>` and add `CONTINUES: <same-id>`, the concrete missing acceptance item, and
CONSTRAINTS / RETURN / STOP. `brief-lint` rejects mismatched continuation IDs, unrelated
next-task reuse and recursive delegation. New unrelated outcomes get fresh workers.
