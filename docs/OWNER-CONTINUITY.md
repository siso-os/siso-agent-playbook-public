# P4 — owner continuity

Use when the project has adopted an every-two-compactions handover, or explicitly
requests an earlier safe handoff. This is an owner procedure, not a global timer.
Runtime-specific event wiring and private state stay with the consuming project.

1. Record each **observed**, uniquely identified compaction once with
   `node bin/owner-handoff-check.mjs record-compaction OWNER_EVENTS.json THREAD EVENT_ID`.
   Keep this small file beside the owner's existing handoff/history. An absent
   hook or missing event is unknown, not a reason to invent two events. A duplicate
   event does not increment the count. Two events make handoff due, not safe.
2. At a settled boundary, the existing owner writes its short handoff through
   the project's durable writeback route: intent/current authority, actual output
   and failed checks, source/branch/commit/index/dirty paths, in-flight work,
   constraints, runtime route and exact next action. Preserve original artifacts
   and recovery references. Do not force a clean Git tree or stop services.
3. Coordinate one read-only successor on the verified same route. Do not create
   a second write driver. Supply the normal entrypoint and exact handoff pointer,
   not the full old chat. The successor reads linked evidence and may ask at most
   one question. If it cannot resolve authority or state, retain the old runtime.
4. Capture a small JSON readback with old/successor thread IDs, handoff SHA-256,
   `readOnly: true`, `questionsAsked`, `unresolvedQuestion`, `verdict`, and concrete
   `intent`, `authority`, `preservation`, `limits`, `next` findings. The existing
   responsible owner checks those findings against reality; word presence is
   not semantic acceptance.
5. Run the release-eligibility check. Its packet carries schemaVersion 1,
   oldThread/successorThread, observed compactions, empty inFlight, handoff and
   readback `{path, sha256}` pointers, preservation document pointers, matching
   oldRoute/successorRoute `{harness, model, provider}`, explicit
   ownerReleaseConfirmed and semanticAcceptance. Paths resolve within the supplied
   private workspace. Preservation receipts must cover the real dirty/index state
   and any still-running services, not merely a Git commit.
   `node bin/owner-handoff-check.mjs check PACKET.json WORKSPACE_ROOT`
6. Only after a pass, re-resolve the exact old and successor runtime identities,
   confirm no intervening writes or in-flight work, and let the old owner
   relinquish the write role. Close only its exact runtime using the supported
   host operation; retain the resumable thread and on-disk source/history. Then
   promote the successor and record lineage in the existing handoff/index.
   A failed/ambiguous close or failed successor leaves the successor read-only.

The checker performs no runtime action and does not enable/trust hooks, dispatch,
change models/providers, archive sessions, or install the Playbook's scheduler.
Inspect actual effective hooks before configuring any owner-specific callback.
Never use the repository's whole-stack installer just to adopt this procedure.

Verification: `node --test tests/owner-handoff-check.test.mjs`. Fixture checks
prove gate mechanics only; a real owner pilot must separately prove event capture,
durable source preservation, cold comprehension and single-writer release.
