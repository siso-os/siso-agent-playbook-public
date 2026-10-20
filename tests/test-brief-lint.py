"""Offline dispatch contract checks; no agents, services, or temporary files."""
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
BASE = "TASK: TASK-7\nCONSTRAINTS: write only the assigned file\nRETURN: result\nSTOP: when acceptance is met\n"


class BriefLintTests(unittest.TestCase):
    def lint(self, text):
        return subprocess.run(
            [sys.executable, str(ROOT / "bin/brief-lint"), "-"],
            input=text, text=True, capture_output=True,
        )

    def test_same_task_repair_can_reuse_session(self):
        result = self.lint(BASE + "CONTINUES: TASK-7\nReuse the session to repair the failed acceptance item.\n")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_unrelated_and_ambiguous_continuations_are_rejected(self):
        for suffix in (
            "CONTINUES: TASK-8\n",
            "CONTINUES: TASK-7\nCONTINUES: TASK-7\n",
            "Reuse the session.\n",
            "CONTINUES: TASK-7\nNext task: a different change\n",
        ):
            with self.subTest(suffix=suffix):
                self.assertEqual(self.lint(BASE + suffix).returncode, 64)

    def test_continuation_does_not_bypass_other_bounds(self):
        for text in (
            BASE + "CONTINUES: TASK-7\nSpawn sub-agents.\n",
            BASE.replace("RETURN: result\n", "") + "CONTINUES: TASK-7\n",
            BASE.replace("STOP: when acceptance is met\n", "") + "CONTINUES: TASK-7\n",
        ):
            with self.subTest(text=text):
                self.assertEqual(self.lint(text).returncode, 64)

    def test_every_dispatch_template_passes(self):
        for name in ("implementer", "scout", "verifier", "refuter", "nversion-builder", "miner", "bookkeeper"):
            with self.subTest(name=name):
                result = self.lint((ROOT / "prompts" / f"{name}.md").read_text())
                self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
