# Provenance

## Public-home migration

- Date: 2026-07-30
- Source: the nested `siso-agent-playbook` Git repository preserved in the Agent Base warehouse
- Source HEAD: `fd4405bcd676b4f473da2d185d50695b10cd46f2`
- Destination Work: `gls:work:083503ab-c78e-4e07-ac40-ab9466dcedcc`

The destination retains the original two-commit public history and records the destination's placeholder commit through a no-content merge. Four pre-existing working-tree modifications were then preserved from the warehouse: the MiniMax five-hour-window health probe and updates to model-routing, subagent, and telemetry skills.

The old GitHub remote was not reachable during migration, so the verified local Git object store was the history source. The warehouse checkout remains untouched.

Publication cleanup removed one duplicate backup skill file, replaced one personal documentation path, and made the direct MiniMax probe accept `MINIMAX_API_KEY` explicitly rather than scraping a machine-specific secrets file.

The repository-root MIT license from SISO Agent Base accompanies this SISO-owned playbook source.
