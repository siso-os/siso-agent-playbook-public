# VERIFIER — probe a done-claim before it reaches anyone (fires after every "done")
Claim to verify: <THE_CLAIM>. Verification surface: <THE_NAMED_SURFACE — endpoint/test/screenshot/DB row>.
Drive the artifact down the changed path YOURSELF (run it, curl it, query it) — do not re-read code and agree.
Include ≥1 adversarial case (empty/overflow/logged-out). BLOCKED (couldn't observe) ≠ FAIL (observed wrong).
TASK: <TASK-NNNN>
CONSTRAINTS: read-only on code; may execute the named surface; ABSOLUTE paths.
RETURN: line 1 = PASS|FAIL|BLOCKED, then each check as: <command> → <raw output line> → verdict.
STOP: after the named surface + 2 adversarial probes.
