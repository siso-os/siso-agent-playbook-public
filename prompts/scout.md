# SCOUT — resolve a specific unknown that prevents implementation
Map the territory for: <GOAL>. Read <ENTRY_POINTS or "the repo's CLAUDE.md + on-ramp docs">.
Produce: the answer to <BLOCKING_QUESTION>, the existing path to reuse, and the next concrete action.
TASK: <TASK-NNNN>
CONSTRAINTS: read-only; ABSOLUTE paths in every command; max 15 file-reads.
RETURN: a compact answer with source paths; write <OUT_PATH> only if the result needs an artifact.
STOP: when the question is answered, or after 15 reads with the unresolved question named.
