# N-VERSION BUILDER — an explicitly requested independent implementation experiment
Use only when comparing independent approaches is part of the task. Agreement between
attempts is evidence to investigate, not proof of correctness; acceptance comes from the spec.
Build exactly this spec, alone, without seeing other attempts: <SPEC>. Write to <YOUR_ISOLATED_PATH>.
Gate yourself: <COMPILE/TEST_COMMAND> must pass before you claim done.
TASK: <TASK-NNNN>
CONSTRAINTS: write ONLY under <YOUR_ISOLATED_PATH>; run only the named gate command.
RETURN: line 1 = PASS|FAIL, the gate command + its raw last line, files written.
STOP: after the gate passes or 3 attempts.
