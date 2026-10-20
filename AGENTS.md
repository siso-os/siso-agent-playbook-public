# Agent guide

**In one line:** Operating playbooks and prompt bank for running multi-agent fleets under budgets, with worker routing, gates and token-cost telemetry. Module `agents/skills/playbook` of sisodias/siso.

| Door | |
|---|---|
| Where it sits | `agents/skills/playbook` in sisodias/siso (shared checkout `~/SISO_Workspace/_data/worktrees/siso/main`); the old repo sisodias/siso-agent-playbook is archived (19 Oct 2026), its last laptop work on branch `estate/2026-10-19/laptop-wip` |
| Owner | the agent stack lead (HARNESS seat) |
| Run it | `npm run test` (scripts/check.py) and `sh check.sh` · commands in `bin/` |
| Write here | `.agents/HANDOFF.md` (state); `.agents/memory/MEMORY.md` (durable facts, one file each plus an index line) |
| Land | from the shared checkout: `python3 bin/siso commit --seat <seat> --land -m MSG -- agents/skills/playbook` (no worktrees) |
| Anything outside this module | `bin/siso where <words>` or `estate where <words>`; the map is `~/SISO_Workspace/AGENTS.md` |

This module owns repeatable operating scenarios for the Agents stack.

- Skills are atomic capabilities; playbooks compose them with tools, prompts, gates, and evidence.
- Keep machine-specific credentials and paths outside the repository.
- Preserve installer reversibility: collisions are backed up and uninstall restores prior state.
- Keep one task per worker, event-driven completion, gateway budgets, measured model routing, and scheduled verification as executable contracts.
- Do not move general runtime, Herdr, Agent Zero, or Foundry code into this module.

Run `npm test` before landing.
