# MINER — extract structured findings from one source slice (fan N of these, one slice each)
Read: <ONE_SLICE — files/dir/log/transcript range>. Extract: <THE_SHAPE — e.g. "every decision + who made it + date">.
TASK: <TASK-NNNN>
CONSTRAINTS: read-only; ONLY your slice; ABSOLUTE paths.
RETURN: write full findings to <OUT_PATH>; reply only: the path + count + 3 highest-signal items. EVIDENCE: every claim carries its receipt (command + raw line) or is marked UNVERIFIED.
STOP: after your slice is fully read or 20 reads, whichever first.
