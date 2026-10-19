# Glotty Code Review — Divergence from Concept & Implementation Plan

**Date:** 2026-10-19
**Scope:** Whole codebase compared against `Glotty_Concept.md` (the spec) and `Implementation_Plan.html`. Claims in `Walkthrough.html` were checked against the code.
**Status:** Review only. No code has been changed yet.

## Summary

The schema and module names follow the plan, but the parts that carry the concept are faked, bypassed, or used only by demo dashboards. The "all acceptance gates PASSED" results in `Walkthrough.html` are not real. The build order in §49 was reversed: effort went into demo UI while the evaluator (steps 1–3) was simulated.

---

## Critical: the reported results aren't real

### 1. The evaluator benchmark is rigged

When Gemini isn't available, `evaluateSimulated()` in [src/lib/evaluator/gemini_async.ts](src/lib/evaluator/gemini_async.ts) (lines ~130–345) checks for substrings copied from the 26 gold-set sentences (`"pasamos para córdoba"`, `"tarde para el tráfico"`, …). That is why the Walkthrough reports 100% accuracy and exactly a 7.7% UNCERTAIN rate (2 of 26 items, the two the gold set labels uncertain).

Check: two gold errors were reworded slightly and run through the fallback with the API key blanked.

```
gold PI.01 (verbatim)    incorrect  PI.01
same error, reworded     uncertain  null
gold PP.05 (verbatim)    incorrect  PP.05
same error, reworded     uncertain  null
```

- The live path calls `gemini-1.5-flash`. Google has retired that model, so real calls will most likely fail and silently drop to this fallback, including in the live `/api/sessions/turn` route.
- No real evaluator has ever been measured. The concept calls this the most important risk (§21, §50).

### 2. The gold set isn't a gold set

[data/gold_set/spanish_b1_gold.json](data/gold_set/spanish_b1_gold.json) has 26 made-up sentences. §24 asks for 400–600 real learner responses per cluster, two independent annotators, inter-annotator agreement (κ) gates and a held-out split. None of that exists. Taxonomy codes PI.07 and PP.06 have zero items.

### 3. The insight gate is bypassed in practice

The gate function in [src/lib/insight/gate.ts](src/lib/insight/gate.ts) is fine, but its callers feed it made-up inputs:

- [src/app/api/sessions/complete/route.ts](src/app/api/sessions/complete/route.ts) invents the posterior as `0.65 + n*0.08` and sets `counterHypothesisProbed: obsList.length >= 4`. No probe is ever run, which removes the protection §9 says "matters most."
- The policy's `pendingCounterProbeCode` parameter (in `selectPolicyAction`) is never passed by any caller, so a probe can't be triggered.
- [src/app/api/sessions/simulate-journey/route.ts](src/app/api/sessions/simulate-journey/route.ts) builds the passing candidate by hand, with fake event IDs (`"ev_s1_1"`) and a hardcoded `0.89`. The "cold start → earned insight" demo is scripted.

### 4. The event log isn't immutable

- There's no `REVOKE UPDATE, DELETE ON events` (Appendix A) in the migrations.
- `simulate-journey` runs `db.delete(events)` on every call.

---

## Architecture that differs from the concept

### 5. The fast/slow evaluation split is inverted (§22, §45)

[src/app/api/sessions/turn/route.ts](src/app/api/sessions/turn/route.ts) waits on the LLM inside the request.

- The sync result is computed and then thrown away. Only its execution time is stored, in `latency_ms`, which is meant to hold the learner's response time.
- Every event is written as `eval_path: "async"`.
- There are no items and no stored answer keys (`itemAnswerKey` is never written), so the answer-key matching path never runs.
- There's no morphology check (no spaCy or Stanza).
- The concept tag is a regex: the message is tagged `es.sem.por_para` if it contains "por" or "para", otherwise `es.gram.aspect.pret_imp`.

### 6. The learner model is weaker than described (§14, §16, §17, §35)

In [src/lib/learner/state.ts](src/lib/learner/state.ts) and [src/lib/learner/replay.ts](src/lib/learner/replay.ts):

- `evidence_weight` is hardcoded to 0.4 on write and then ignored on replay, where it is recomputed. The long-gap weight (×1.2) is missing.
- Uncertain results from the fallback carry confidence 0.5, so they enter the model at weight 0.4 instead of the ~0.1 in §23.
- The ordering rule ("production implies recall implies recognition", §14) only clamps `estimate`. The next update recomputes it from alpha/beta, so the clamp does nothing. §14 also says violations should be flagged, not silently fitted.
- Every conversation turn updates only the "spontaneous" level.
- There's no hierarchical pooling. §17 says this cannot be added later; the prior is one hardcoded constant.
- Replay defaults missing confidence to `0.8`.
- There's no versioned labels layer (events → labels → learner_state), and the `learner_state_snapshots` table is never written.
- [src/lib/learner/fsrs.ts](src/lib/learner/fsrs.ts) isn't real FSRS and is used only by the `/api/learner/simulate` demo endpoint.

### 7. Policy and exploration data would not be usable for causal analysis (§27–§30)

In [src/lib/policy/bandit.ts](src/lib/policy/bandit.ts) and [src/lib/policy/exploration.ts](src/lib/policy/exploration.ts):

- Propensities are invented: 0.9 for the top choice, 0.85 at cold start. Control is logged as `propensity 1.0, isExploration: true`.
- The control cohort is never assigned (the cohort is hardcoded `"adaptive"`). If it were, it would always "review", which is the strawman control that §30 and §44 warn against.
- Explanation style is randomized but never logged in the event.
- When jitter fires, its propensity isn't combined into the logged propensity.
- `applyExplorationGuardrails` is only called by the `/api/policy/decision` demo endpoint, not the real session flow.
- The chosen action doesn't change anything: tutor replies are 3 canned strings picked by `message.length % 3`, plus two hardcoded probe replies. No explanations, items, re-tests or reading are delivered.
- The 40% input budget (§31) is missing. Actions `listen`, `introduce` and `retrieve` (§27) are missing.

### 8. Auth isn't enforced

Better Auth is configured in [src/lib/auth.ts](src/lib/auth.ts), but every API route trusts `userId` from the request body and defaults to `"usr_b1_learner_default"`. Anyone can read or write any learner's data. `/api/sessions/start` auto-creates a fake "Alex Rivera" user.

### 9. Smaller gaps

- **Circuit breaker (§11):** per-user rather than global, starts only after 5 ratings, and never raises the gate thresholds. "This is wrong" ratings aren't stored as events or sent for review.
- **Concept graph (§18, Appendix C):** 34 nodes and only one `interferes_with` edge. Nodes lack applicable diagnostic codes, item-pool references and prerequisite closure. `edge_type` is free text rather than an enum.
- **Model gateway (§36):** missing; the provider is hard-wired. Two Gemini SDKs are installed (`@google/genai` and `@google/generative-ai`).
- **Session design (§41, §43):** steps 3–7 of the first-session flow (calibrated framing, targeted intervention, re-test, scheduling, continuity) aren't implemented. Session-end text is static.
- **Tests:** `test:sync` in `package.json` points to a file that doesn't exist. There are no latency or gate npm scripts as the plan listed.

---

## Root cause

§49's build order was reversed. About 1,900 lines went into four "Studio" dashboards (`src/app/{evaluator,learner,policy,insights}/page.tsx`) and a scripted journey, which is exactly the "start at step 6 because it demos well" warning in the concept. Meanwhile steps 1–3 (taxonomy plus a real gold set, then a measured evaluator) were simulated.

---

## Suggested path back (in order)

1. **Honest evaluator.** Delete `evaluateSimulated`; when the LLM is unavailable, return `UNCERTAIN` or fail loudly. Put the LLM behind a provider-agnostic model gateway with a current model.
2. **Honest benchmark.** Separate dev and held-out gold splits. Fail if the API is unavailable rather than falling back. Start real gold-set annotation, which needs a linguist (§48).
3. **Fast/slow split.** Move the LLM evaluation out of the request path into a background job. Store the sync result (with `eval_path: "sync"`) and the learner's real latency on the event, and write the async label as a separate, versioned derived record.
4. **Immutability.** Add a migration that revokes `UPDATE` and `DELETE` on `events` from the app role. Stop `simulate-journey` from deleting events, or remove it.
5. **Real gate inputs.** Compute the posterior and counter-probe status from real events. Wire probe items, built from the taxonomy's distinguishing probes, into the policy.
6. **Auth and causal logging.** Get `userId` from the Better Auth session on the server. Assign cohorts at sign-up. Log real propensities and explanation style. Call the guardrails in the live flow.
7. **Freeze the demo dashboards** until steps 1–6 pass.
