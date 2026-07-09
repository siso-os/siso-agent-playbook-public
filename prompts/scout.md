# SCOUT — map before building (fires before every build task)
Map the territory for: <GOAL>. Read <ENTRY_POINTS or "the repo's CLAUDE.md + on-ramp docs">.
Produce: the file/dep map, what already exists (reuse-first!), the 3 biggest risks, where prior work lives.
TASK: <TASK-NNNN>
CONSTRAINTS: read-only; ABSOLUTE paths in every command; max 15 file-reads.
RETURN: write findings to <OUT_PATH>; reply with only the path + a 5-line digest (exists-already / build-new / risks).
STOP: after 15 reads or when the map is complete, whichever first.
