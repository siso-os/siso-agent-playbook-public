---
name: model-routing
description: "Benchmark-calibrated capability matrix for the SISO model fleet (Fable 5, Opus 4.8, GPT-5.5 via Codex CLI, MiniMax M3, Haiku). Load BEFORE choosing a model for a non-trivial dispatch, when designing a fleet/plan (who does what), when a model underperforms on a task class (escalate per the ladder), or when Shaan asks which model is best at X. Priors = Artificial Analysis benchmarks (dated, receipts); posterior = our own observed outcomes (burn scars + EFFICIENCY.html). Route by strengths, not folklore."
---

# model-routing — use each model where it measurably wins

**The principle (Shaan, 2026-07-10):** don't route by habit — analyze what each model is actually good at on real benchmarks, encode it, and use models to their strengths. Benchmarks are the PRIOR; our own observed outcomes are the POSTERIOR that overrides them.

## The capability matrix (priors: Artificial Analysis Intelligence Index v4.1 + vendor evals, pulled 2026-07-10)

| Model | Intelligence (AA idx) | Coding | Terminal/agentic | Cost/notes | USE FOR |
|---|---|---|---|---|---|
| **Fable 5** (max) | **60 — #1 of 134** | (no separate idx published) | — | scarcest tier; classifier-flips on sensitive content + on ping-spam | **Planning, synthesis, final judgment, god-question passes, campaign leads.** Never bulk, never a sub-agent (hook ban). |
| **GPT-5.5 via Codex CLI** (medium/xhigh) | 59 / 58 / 56 — #2-#4 | GPT-5.x: SWE-Bench Pro 58.6% | **Terminal-Bench 82.7% IN Codex CLI — the champion** | own ChatGPT-Pro account ($0 to Claude plan) | **Hard coding problems, architecture, adversarial/critical review, second opinion on Fable output.** Fire via `codex exec -m gpt-5.5` (default `--deep`=xhigh). Selective — not routine work. **⚠ `gpt-5.6-sol` was a PHANTOM id — not on this account; requesting it silently falls back to gpt-5.4 (a downgrade). 5.5 is the real ceiling until OpenAI ships 5.6 (verify via `codex exec -m <id>` — if it warns "Model metadata not found", the id is phantom).** (2026-07-11) |
| **Opus 4.8** (max) | 56 — #5 on Index v4.1 (the 61.4 figure is Index **v4.0** — version difference, resolved by Sol dossier 2026-07-10) | **SWE-Bench Pro 69.2% — the champion** | Terminal-Bench 74.6%, OSWorld 83.4% | Max plan, scarce; 1M variant for long-context synthesis | **Deep repo-level bug-fixing/judgment coding, long-context synthesis, stable leads on flip-risky content** (adult-cam workloads flip Fable → Opus is the STABLE lead there, brain.md 2026-07-03). |
| **MiniMax M3** | 55 reasoning / 44 base — **#1 open-weights** | SWE-Verified 80.5%, SWE-Pro 59.0% (vendor-run, self-scaffolded — grade B) | Terminal-Bench 66.0%, MCP Atlas 74.2, BrowseComp 83.5 | **$0.30/$1.20 per M tok, 1M ctx, ~95 t/s, VERBOSE**; ~unlimited plan; throttles ~5-6 concurrent | **The bulk tier: read/classify/verify/mine/extract, N-version mechanical builds (compile-gated), browse-heavy research.** One bounded job per fresh worker. |
| **Haiku 4.5** | not indexed here | — | — | `model: haiku` on Agent tool AUTO-ROUTES to M3 via Bifrost **in this stack** | In-harness it lands on M3 — but Haiku is a distinct low-latency model, not intrinsically an alias (Sol correction): telemetry logs the model actually SERVED; direct-Anthropic Haiku stays an option for latency-critical probes. |
| **Sonnet (any)** | — | — | — | **BANNED** (hook-enforced): M3 (55) outbenches it at a fraction of the cost — the ban is now benchmark-corroborated, not just directive. | never |

Receipts: artificialanalysis.ai/models (Intelligence Index v4.1: Terminal-Bench v2.1, SciCode, GPQA-D, HLE, τ³-Banking, GDPval, CritPt, AA-Omniscience, AA-LCR) + artificialanalysis.ai/models/minimax-m3 + MiniMax launch post (vendor numbers: treat as grade B — self-run, Claude-Code-scaffolded, compared vs Opus 4.7 not 4.8).

## What the benchmarks SETTLE for our routing

1. **Terminal-grind belongs to Codex** (GPT-5.x + its CLI = 82.7% Terminal-Bench, 16pts over M3): long mechanical multi-file work, migrations, test-fixing marathons → Codex panes/dispatch, not M3, when correctness-per-attempt matters.
2. **Repo-level judgment coding belongs to Opus** (SWE-Pro 69.2%): the subtle two-week-arc bug, the cross-module regression — NOT context-blind fan-out fodder (matches the GOT-BASED scar 2026-07-09).
3. **M3 is genuinely strong, not just cheap** (#1 open-weights, 80.5 SWE-Verified): mechanical/bounded coding with compile gates is FINE on the unlimited tier (Shaan override 2026-07-10, memory: minimax-can-code-on-override) — the drain was session-reuse + self-fanning, not M3 writing code.
4. **Fable and Sol-max are peers at the top** (60 vs 59): pair them — Fable plans/synthesizes, Sol adversarially reviews (PAIR gate). Their disagreement is signal, not noise.
5. **Speed/verbosity tax on M3:** verbose output = context tax for whoever reads it — enforce compact RETURN contracts hardest on the M3 lane.

## Escalation ladder (refined per Sol dossier 2026-07-10 — shape-first, then confidence)

**Route by task SHAPE first — judgment work doesn't earn its tier through failures:**
- Judgment-heavy repo bugs / subtle regressions → **Opus directly** (SWE-Pro champion).
- Irreversible / architectural planning → **Fable directly**, Sol adversarially reviews. They are complementary, NOT interchangeable, despite near-equal composite scores: Fable = planning/synthesis, Sol = terminal execution + cross-vendor review.
- Scaled acquisition / scraping / extraction / bulk classify → **M3**; contested FINAL synthesis of what M3 gathered → Fable/Opus, with Sol as verifier.

**Then the ladder for mechanical/ambiguous work:**
```
M3 (bounded, fresh, compile/verify-gated)
  → ONE semantic/invariant failure (not a flake)? → Codex/Sol (mechanical-hard) or Opus (judgment-shaped)
    → still contested? → council (Fable + Opus + Sol independent takes; Shaan tie-breaks)
```
De-escalate too: a task class M3 keeps passing at the verify gate STAYS on M3. Two closing rules from the dossier: never infer capability from a gateway alias; never infer cost-per-outcome from token totals without task attribution. Deep dive: `SISO_Agent_Base/siso-agent-playbook/docs/MODEL-CAPABILITY-DOSSIER.html` (34KB, scenario×model winners + per-model failure modes).

## Our observed posteriors (override benchmarks when they conflict)

- M3 workers ask permission instead of acting + lack the Write tool in claude-mini (use Bash-command contracts) — 2026-07-10 E2E.
- M3 reused sessions = 75% of the lane's burn (fresh-per-task is structural now).
- Fable flips to Opus on adult-platform content and on ping-spam — route Oracle-streaming leads to Opus.
- Codex util was 30-40% under deliberating leads — the bottleneck is dispatch shape, not Codex capability.
- **Feed the posterior:** `.agents/telemetry/EFFICIENCY.html` tokens-per-delivered-task by lane; when its per-lane outcomes contradict this matrix, the matrix updates.

## Refresh protocol
Quarterly (or on any new model in the fleet): re-pull artificialanalysis.ai/models, update the matrix + date, diff the USE-FOR column against EFFICIENCY.html's observed per-lane outcomes, log changes in this file's history. A matrix older than a model generation is folklore again.
