#!/usr/bin/env python3
"""Check shell syntax, skill contracts, reversible install, and publication safety."""

import os
from pathlib import Path
import py_compile
import re
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[1]


def run(command, **kwargs):
    subprocess.run(command, cwd=ROOT, check=True, **kwargs)


entrypoints = [ROOT / "install.sh", ROOT / "uninstall.sh"]
entrypoints.extend(path for path in (ROOT / "bin").iterdir() if path.is_file())
shell_files = [path for path in entrypoints if "bash" in path.read_text().splitlines()[0]]
for path in shell_files:
    run(["bash", "-n", str(path)])
for path in entrypoints:
    if "python" in path.read_text().splitlines()[0]:
        py_compile.compile(str(path), doraise=True)

skills = sorted((ROOT / "skills").glob("*/SKILL.md"))
assert skills, "no skills found"
for skill in skills:
    text = skill.read_text()
    assert text.startswith("---\n"), f"missing frontmatter: {skill}"
    assert re.search(r"^name:\s*\S+", text, re.MULTILINE), f"missing name: {skill}"
    assert re.search(r"^description:\s*.+", text, re.MULTILINE), f"missing description: {skill}"

with tempfile.TemporaryDirectory(prefix="siso-agent-playbook-check-") as directory:
    root = Path(directory)
    env = dict(os.environ)
    env["PREFIX"] = str(root / "home")
    env["WORKSPACE"] = str(root / "workspace")
    run(["bash", "install.sh"], env=env, stdout=subprocess.DEVNULL)
    assert (root / "home" / ".claude" / "skills" / "subagents").is_symlink()
    assert (root / "home" / "bin" / "lane-health").is_file()
    run(["bash", "uninstall.sh"], env=env, stdout=subprocess.DEVNULL)

patterns = [
    re.compile("/" + "Users" + "/"),
    re.compile("BEGIN (?:RSA |OPENSSH |EC |DSA )?" + "PRIVATE KEY"),
    re.compile("(?:ghp|github_pat|sk)" + "-[A-Za-z0-9_-]{16,}"),
]
for path in ROOT.rglob("*"):
    if ".git" in path.parts:
        continue
    if path.is_symlink():
        text = os.readlink(path)
    elif path.is_file():
        try:
            text = path.read_text()
        except UnicodeDecodeError:
            continue
    else:
        continue
    for pattern in patterns:
        if pattern.search(text):
            raise SystemExit(f"publication safety match {pattern.pattern!r} in {path.relative_to(ROOT)}")

print(f"PLAYBOOK_CHECK_OK ({len(skills)} skills, {len(entrypoints)} entrypoints)")
