# Agent guide

This repository owns repeatable operating scenarios for the Agents stack.

- Skills are atomic capabilities; playbooks compose them with tools, prompts, gates, and evidence.
- Keep machine-specific credentials and paths outside the repository.
- Preserve installer reversibility: collisions are backed up and uninstall restores prior state.
- Keep one task per worker, event-driven completion, gateway budgets, measured model routing, and scheduled verification as executable contracts.
- Do not move general runtime, Herdr, Agent Zero, or Foundry code into this repository.

Run `npm test` before pushing.
