---
name: telemetry
description: Inspect lane health and tokens-per-delivered-task before a parallel wave or after a failed dispatch; report evidence without choosing a replacement model.
---

# telemetry

Read the project-scoped telemetry artifacts under
`$WORKSPACE/.agents/telemetry/`. They answer whether an approved lane is
available and whether work produced a verified deliverable.

## Checks

- Read `LANE-HEALTH.json` before a wave; an unavailable lane is BLOCKED.
- Read `EFFICIENCY.html` or `efficiency.json` after a campaign.
- Require task identity, handoff artifact, and verification result before counting
  work as delivered.

Telemetry observes routing; it never selects a provider or silently substitutes a
lane. Native Codex work is Luna, deliberate review is Sol, and cheap semantic bulk
originating in Claude uses only the Claude Agent `model: haiku` transport.
