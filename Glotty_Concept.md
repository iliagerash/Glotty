# Glotty

## A Language App for Smart People

**Product Concept & Engineering Specification**
*Basis for the development plan*

---

# Part I — The Product

## 1. The problem

Traditional language applications organize learning around content.

```text
Lesson → Exercise → Correct/Incorrect → Points → Next Lesson
```

The problem is that the same lesson is not equally useful to every learner. Two people classified as B1 in Spanish can have entirely different profiles.

One reads well, has strong vocabulary, confuses *por* and *para*, and freezes in spontaneous production. Another has thin vocabulary, follows grammar explanations effortlessly, reads slowly, and produces accurate sentences. A single lesson serves neither.

> **The learner is the curriculum.**

## 2. The Glotty experience

The fundamental experience is not *"here is your next exercise."* It is:

> **"We noticed something about you."**

**The hidden weakness.** *You actually understand the imperfect. Your problem is narrower: when telling a story, you use the preterite for events that provide background. Let's fix that.*

**The false confidence.** *You know* aprovechar *when you see it — 94% of the time. But when speaking you almost never retrieve it. You're not missing the word. You're missing access to it.*

**The unexpected connection.** *You already understand this construction, because English has a similar structure. You've been treating it as a new rule when it's a familiar concept expressed differently.*

**The recurring misconception.** *We've seen this seven times. It isn't really a* por/para *problem. You consistently confuse* **beneficiary** *with* **purpose**. *Here's the distinction.*

The underlying models exist to make these observations possible. Everything technical in this document is in service of that sentence.

## 3. Magic moments

These are product specifications, not aspirations. Each names a capability with a measurable implementation.

**Glotty remembers.** A learner errs today. Three weeks later, in unrelated conversation, the same underlying misconception resurfaces and Glotty recognizes it. *Requires:* persistent diagnosis codes, cross-session linkage of observations to a misconception rather than to an exercise.

**Glotty distinguishes symptom from cause.** Rather than "practice por and para," Glotty identifies the semantic confusion generating the errors. *Requires:* a diagnostic taxonomy (Appendix B) and an evaluator that emits codes, not booleans.

**Glotty knows what you almost know.** Recognition 96%, contextual use 91%, recall 78%, production 44%, spontaneous use 31%. *You don't need to learn this word. You need to make it available.* *Requires:* per-lexeme, per-competence-level state.

**Glotty finds the missing concept.** Three apparently unrelated errors share a dependency in the concept graph; Glotty teaches the dependency rather than the three symptoms. *Requires:* typed edges in the graph and an inference step over co-occurring failures.

**Glotty knows when not to teach.** An error during a hard conversational moment, inconsistent with normal performance, is recorded rather than acted on — later resolved as a performance slip rather than a knowledge gap. *Requires:* uncertainty in the learner model and evidence weighting by context (§16).

**Glotty changes its explanation.** When the rule-based explanation fails, Glotty tries a conceptual one — *think of the imperfect as the camera angle; it tells you what was already happening in the scene* — and remembers that this learner responds to conceptual framing. *Requires:* explanation styles as a randomized, logged treatment (§20).

## 4. The learning loop

```text
Experience → Observation → Interpretation → Insight
     → Targeted intervention → New evidence → Updated understanding
```

At the product level: **Notice → Understand → Try → Discover → Remember.**

The exercise is not the unit of learning. The learner's evolving state is.

## 5. Learning through meaning

Glotty is for learners who want to understand how languages work.

Instead of *ser* = permanent, *estar* = temporary, Glotty teaches the conceptual distinction and tests it across contexts. Instead of five *por/para* rules, it builds a semantic model over purpose, beneficiary, destination, cause, exchange, duration, and route. Instead of "completed vs ongoing," it teaches how Spanish structures events inside a narrative.

> The goal is not to remember a rule. The goal is a mental model that generates correct language.

## 6. Conversation as the natural interface

Conversation should become the primary entry point. The learner talks about work, books, politics, travel, science, history — whatever interests them. The conversation is simultaneously practice, assessment, content discovery, and personalization.

Glotty does not interrupt. A learner writes:

> *El año pasado fui a México y estaba muy interesante...*

Glotty continues naturally and records the observation. Afterward: *I noticed one thing worth fixing.* This is a fundamentally different relationship from a grammar checker that stops you every sentence.

## 7. The post-session insight

Sessions end with a small number of high-value observations, not a score.

> **What I noticed**
>
> **1. Your vocabulary is stronger than your production.** You recognized almost every target word but avoided several while writing.
>
> **2. Your imperfect is improving.** You used it correctly for background context 6 of 8 times today.
>
> **3. One thing still looks unstable.** You switch to the preterite when introducing a new event inside an ongoing scene.

This is close to what a good human tutor would say. Part II specifies when Glotty is allowed to say it.

---

# Part II — The Insight Discipline

## 8. The cost of a wrong insight

*"How did it know that?"* is the primary product objective. That objective has a failure mode which must be designed against explicitly.

In the first sessions, the learner model is mostly population prior with wide uncertainty. An insight asserted from six observations will frequently be wrong. For an audience of analytical, skeptical learners, one confidently wrong observation about their own competence is disproportionately costly: it converts the product's central claim — *Glotty pays attention* — into evidence that it doesn't.

The asymmetry is severe. A missed insight costs a little delight. A wrong insight costs credibility, and credibility is the entire product.

**Therefore: Glotty is silent by default and earns the right to speak.**

## 9. The insight gate

An observation may be surfaced to the learner only when all of the following hold:

| Condition | Threshold (MVP, tunable) |
|---|---|
| Posterior probability of the diagnosis | ≥ 0.75 |
| Independent supporting observations | ≥ 4 |
| Distinct activity types among them | ≥ 2 |
| Distinct sessions spanned | ≥ 2 |
| Leading counter-hypothesis actively probed | ≥ 1 time |
| Evaluator confidence on supporting items | ≥ 0.7 each |

Observations that fail the gate are not discarded. They update the learner model with appropriate weight and drive activity selection **silently**. The learner experiences a system that quietly gives them the right exercises; they simply aren't told why yet.

The counter-hypothesis probe matters most. Before telling a learner they confuse beneficiary with purpose, Glotty must have presented at least one item that would distinguish that hypothesis from the nearest alternative (undifferentiated L1 "for" transfer, say) and observed the result. Without this, Glotty is pattern-matching rather than diagnosing, and it will be wrong in exactly the interesting cases.

## 10. Hedged and unhedged insight

Two registers, selected by posterior confidence:

**Unhedged** (p ≥ 0.85) — *You consistently confuse beneficiary with purpose.*

**Hedged** (0.75 ≤ p < 0.85) — *I think your* por/para *errors are about beneficiary versus purpose rather than the rules generally. Two quick items will tell us.*

Hedged insight is not a weaker product. For this audience it is often better: it invites the learner into the reasoning, and it makes the following items feel purposeful. It also converts a risky assertion into a legitimate probe.

## 11. The wrong-insight budget

Treated as a hard constraint, not a metric.

- **Learner-rated wrong insights: ≤ 3% of surfaced insights.** Breaching this halts insight surfacing and raises the gate thresholds until the cause is found.
- **Learner-rated useful insights: ≥ 50% of surfaced insights.** Below this, the insight feature is not earning its risk.
- Every surfaced insight carries a lightweight response affordance — *useful / not useful / this is wrong*. "This is wrong" is high-value training signal and should be treated as a first-class event, routed to review.

A learner who marks an insight wrong is usually right, and usually the item set was testing something other than what it claimed to.

## 12. Cold start

For roughly the first two sessions Glotty has almost no learner-specific evidence, and the gate will correctly block nearly everything. This must be designed for rather than papered over.

What Glotty can honestly offer in session one:

- **The diagnostic result**, framed as a starting hypothesis rather than a finding — *here's where I think you are; I'll be revising this.*
- **Observations about the language, not the learner.** The *por/para* semantics, the aspect system as narrative structure. These are genuinely interesting to the target audience and require no learner evidence.
- **An explicit statement of the mechanism.** *I'm going to be building a model of your Spanish. It'll be vague for a week and then it gets specific.* Setting the expectation converts early vagueness from a defect into a promise.

The first two sessions determine whether there is a third, so they should be built and tested as their own artifact, not as a degraded version of the steady state.
---

# Part III — The Learner Model

## 13. Dimensions

Glotty maintains a multidimensional probabilistic representation.

```text
Vocabulary      recognition 91%   recall 76%   production 61%
Grammar         present indicative 94%   preterite 82%   imperfect 68%
                subjunctive 41%   por/para 57%
Comprehension   written 88%   conversational 64%
Production      grammaticality 71%   lexical range 63%   naturalness 54%
```

Every estimate carries uncertainty. The system distinguishes *"we have strong evidence you know this"* from *"we have tested this twice."* Storing a point estimate without its evidence count makes the policy unable to tell the difference between a settled fact and a guess, which is the difference between practising and probing.

## 14. Kinds of knowing

Knowledge is not binary. For *aprovechar*:

```text
Recognize form         96%
Understand in context  91%
Recall                 78%
Produce spontaneously  44%
Use naturally          31%
```

These levels are ordered, and the model should encode the ordering as a constraint: production implies recall implies recognition. This is not a simplification — it is a monotonicity assumption that materially reduces free parameters and stabilizes estimates under sparse data. Violations are informative when they occur and should be flagged rather than fitted.

## 15. The instructional profile

Glotty should learn not only what the learner knows but how this person learns.

```text
prefers conceptual explanations
retains etymological framing well
benefits from contrastive examples
performs poorly on isolated vocabulary
high conversational tolerance for ambiguity
```

Two learners with identical linguistic weaknesses may receive entirely different explanations. **This profile can only be learned from randomized explanation assignment** (§20). Without randomization, "this learner does better after conceptual explanations" is confounded with which concepts happened to receive which explanation.

## 16. Evidence weighting

Not all observations are equal, and the weight is part of the model, not a detail.

| Source | Relative weight | Rationale |
|---|---|---|
| Controlled item, high evaluator confidence | 1.0 | Cleanest signal |
| Controlled item, uncertain evaluation | 0.1 | Logged, near-zero influence |
| Constrained production | 0.8 | Intent mostly recoverable |
| Free conversation | 0.4 | Real-time noise, ambiguous intent |
| Reading comprehension check | 0.6 | Confounded with world knowledge |
| Item after a long gap | 1.2 | Retention evidence is scarce and valuable |

Conversational evidence is deliberately down-weighted. Under real-time pressure, competent speakers produce errors they would never produce with time to reflect. Treating a conversational slip as equivalent to a considered wrong answer systematically underestimates competence — and produces exactly the wrong insights, which §11 budgets against.

## 17. Estimation methods

These are model candidates, replaceable without architectural change.

**Retention and scheduling.** A DSR-style model (difficulty, stability, retrievability); FSRS is the best-documented open implementation and predicts recall probability at a given delay, updating stability from each outcome. Duolingo's half-life regression work is a useful reference for fitting this on messy production data at scale.

**Mastery.** Item response theory or Bayesian knowledge tracing at concept level. Both produce calibrated probabilities with uncertainty, which is what the policy and the insight gate require. Deep knowledge tracing is more expressive, needs far more data, and is much harder to debug — a later option, never a starting point.

**Sparsity is the real problem.** Glotty estimates several parameters per concept across many concepts from a few dozen observations per learner in the first weeks. Independent per-learner estimates will be noise. The fix is hierarchical pooling: a learner's estimate for a concept starts at the population posterior for similar learners and moves toward individual evidence as evidence accumulates.

This is not a refinement to add later. It determines the shape of the feature store and the learner-state table, and retrofitting it means rebuilding both. It is also what makes the diagnostic worth running — the diagnostic buys an informed position in the population distribution instead of a flat prior.

**Practical consequence.** A new learner is mostly prior. Part II §12 makes this a product stance rather than a hidden weakness.

---

# Part IV — Language Intelligence

## 18. The knowledge graph

Glotty represents language as an interconnected graph across vocabulary, morphology, syntax, semantics, pragmatics, phonology, and orthography.

```text
past events
    ├── preterite
    └── imperfect
          ↓
    aspectual distinction
          ↓
    narrative competence
```

**MVP scope: roughly 40 nodes**, covering the two target clusters plus their prerequisites and near neighbours. Not all of Spanish. A graph large enough to demonstrate dependency reasoning and small enough that every node can have a hand-checked item pool and a defined diagnostic profile.

**Storage: relational tables in Postgres.** Forty nodes with typed edges does not justify a graph database. `concepts` and `concept_edges` with recursive CTEs is sufficient through at least a few thousand nodes.

**Edge types**, all directed:

| Type | Meaning | Use |
|---|---|---|
| `prerequisite` | B requires A | Root-cause search on failure clusters |
| `contrasts_with` | Distinguishing A from B is itself the skill | Generating contrastive item sets |
| `instance_of` | A is a specific case of B | Aggregating evidence upward |
| `interferes_with` | L1 structure A induces error in L2 B | Cross-language prediction (§19) |

The `interferes_with` edge is what makes the learner's full repertoire usable rather than decorative.

**Concept ID convention:** `{lang}.{domain}.{family}.{concept}`

```text
es.gram.aspect.pret_imp
es.sem.por_para.beneficiary
es.sem.por_para.route
es.lex.aprovechar
es.phon.stress.penultimate
```

Stable, human-readable, sortable by prefix, and safe to embed in event rows for the life of the dataset. Renaming a concept ID after data collection begins is expensive; the convention should be settled before the first event is written.

## 19. Cross-language intelligence

Glotty models the languages the learner already knows.

For an English speaker: Spanish *actual* means "current," not "real" — a false friend worth intervening on. For a learner who also knows French, *nación*/*nation* is a transfer pathway that accelerates acquisition considerably.

More valuable than either: `interferes_with` edges let Glotty **predict** errors before observing them. An English speaker's undifferentiated "for" predicts *por/para* difficulty; English past progressive predicts mechanical mapping to the imperfect. These are priors on the diagnosis, which is exactly what a sparse model needs. They are hypotheses to test, not conclusions — a learner who has already resolved the interference should not be taught it.

## 20. Etymology and explanation style

Etymology is used where it creates retrieval pathways, not as trivia: *noche* ← Latin *nocte(m)*. Whether it works is a per-learner empirical question.

**Explanation style is a randomized treatment.** Whenever the policy triggers an explanation, the style is chosen randomly among eligible styles and logged with its propensity:

```text
rule_based      | conceptual      | contrastive
etymological    | cross_linguistic | example_first
```

This is the cheapest high-value randomization available. It costs nothing in learner outcome — all styles are legitimate — and it is the only way to populate the instructional profile in §15 or to answer "which explanations work for which learners" at population scale.

---

# Part V — Evaluation

## 21. Evaluation is the keystone

The learner model is a function of evaluation outputs. The policy is a function of the learner model. The insight gate is a function of both. The long-term dataset is a log of evaluation outputs.

If the evaluator mislabels 15% of free-form responses, the learner model is 15% noise, the policy optimizes against noise, insights fire on noise, and the immutable event log contains permanently wrong labels. **Immutability is a virtue only if what is preserved is raw evidence rather than conclusions.**

The difficulty is not hypothetical. Consider:

> *Ayer iba al supermercado y compré leche.*

This may be perfectly valid: *iba* backgrounds the trip, *compré* foregrounds the completed purchase. A naive evaluator applying "ayer → preterite" marks it wrong and teaches the learner something false. Judging it correctly requires inferring intent — the same surface string is correct under one intention and odd under another.

Free-form L2 evaluation is not classification. It is charitable interpretation under uncertainty, and LLMs are least consistent at it in precisely the cases that matter: advanced learners making subtle choices.

**Therefore the evaluator is built and measured first, before anything is built on top of it.**

## 22. Dual-path evaluation

**Synchronous path — target p95 < 200ms.**

This budget is only achievable **without an LLM call**. An LLM round trip is 500ms–3s and highly variable. The synchronous path is therefore composed of:

- exact and normalized matching against a pre-computed answer key stored with the item,
- morphological analysis (spaCy or Stanza) for form validation,
- a small fine-tuned classifier for constrained response types.

Used for turn-taking, obvious correctness, structural validation, and immediate in-session decisions.

**Asynchronous path — seconds to minutes.**

LLM-based, batched, larger model, full context. Used for subtle semantic errors, misconception diagnosis, learner-model updates, and historical re-scoring.

The learner never waits for the deep analysis. This split is an architectural constraint, not an optimization: it means item generation must produce and store an answer key at generation time, because the synchronous path has nothing to reason with otherwise.

## 23. Three-valued evaluation

```text
CORRECT | INCORRECT | UNCERTAIN
```

Uncertain observations enter the learner model at weight ≈ 0.1 and never trigger correction. Abstention is a feature: the alternative is confidently telling a learner they are wrong when they are not, which is the most damaging single thing the product can do.

Uncertainty is also an opportunity. Where intent is genuinely ambiguous, asking is better pedagogy than guessing:

> *Did you mean the trip was in progress when something else happened, or that you went and came back?*

The answer converts an ambiguous observation into a clean one, and the question itself teaches the distinction.

## 24. The gold standard dataset

The single most important Phase 1 artifact, and the one most likely to be skipped because it is unglamorous and requires a linguist rather than an engineer.

**Composition.** 400–600 real learner responses per concept cluster, drawn from actual learner production rather than synthesized. Deliberately over-sampled for hard cases: valid-but-unusual constructions, ambiguous intent, correct-for-the-wrong-reason, regionally variable usage.

**Annotation.** Two independent qualified annotators per item, third-annotator adjudication on disagreement. Every item labeled with: binary correctness, diagnosis code from the taxonomy (Appendix B), and an annotator confidence.

**Inter-annotator agreement is a gate on the rubric, not on the annotators.** If humans cannot agree on whether a response is correct, the evaluator cannot be expected to, and that concept's rubric must be rewritten before it enters the product. This is the mechanism by which vague pedagogy is caught before it becomes vague data.

**Held-out split** never used for prompt iteration or fine-tuning. Reported on at every evaluator version.

## 25. Evaluator acceptance gates

| Metric | Gate | Why |
|---|---|---|
| Inter-annotator κ, binary correctness | ≥ 0.75 | Below this the rubric is unusable |
| Inter-annotator κ, diagnosis code | ≥ 0.60 | Diagnosis is intrinsically harder; below this the taxonomy needs revision |
| Evaluator binary accuracy on held-out | ≥ 0.90 | |
| **Precision on INCORRECT** | **≥ 0.95** | False accusation is the trust-killing error; asymmetric by design |
| Diagnosis top-1 accuracy, given INCORRECT | ≥ 0.65 | |
| UNCERTAIN rate | ≤ 15% | Above this the product feels evasive |

Binary accuracy and diagnosis accuracy are reported separately, always. A strong binary number will otherwise conceal a weak diagnostic one, and diagnosis is what the entire insight product rests on.

**No evaluator version ships without a full report on the held-out set.** Every event records `evaluator_version`, and raw responses are retained so the full history can be re-scored when a better evaluator exists.

## 26. The diagnostic taxonomy

The evaluator emits codes, not booleans. The taxonomy is a closed, versioned vocabulary of misconceptions for the MVP clusters — fifteen codes, specified in Appendix B.

Each code carries: a definition, positive examples, **negative examples** (surface patterns that resemble the misconception but are not it), the distinguishing probe that separates it from its nearest neighbour, and the intervention family it triggers.

The negative examples and the distinguishing probe are what make §9's counter-hypothesis requirement implementable. A taxonomy without them produces confident misdiagnosis, which is worse than no diagnosis.

An `UNKNOWN` code is mandatory. Errors that fit nothing in the taxonomy are logged as `UNKNOWN` and reviewed in batch — this is the primary input to taxonomy versioning, and a rising `UNKNOWN` rate is an early signal that the taxonomy has drifted from real learner behaviour.
---

# Part VI — The Learning Policy

## 27. Choosing what happens next

Glotty maintains candidate interventions:

```text
review | explain | contrast | produce | read
listen | conversation | introduce | retrieve | nothing
```

*Nothing* is a real action. A learner who has just consolidated a concept is often best served by not being drilled on it, and a policy without a null action will always find something to do.

The policy estimates which intervention most improves the learner. Initially rule-based over the learner model; contextual bandits once exploration data exists.

## 28. The learning objective

The policy optimizes **durable outcomes**, not immediate correctness.

```text
Objective:
Increase spontaneous productive mastery of the
Spanish preterite/imperfect distinction over a 14-day horizon.
```

Getting an item right now is useful evidence; it is not the goal. A policy rewarded on immediate correctness learns to show easy items, which is the single most common failure mode in adaptive learning systems and is invisible if you only watch session-level accuracy.

The reward signal is therefore delayed and must be constructed: performance on the same concept at a later interval, in a different activity type, ideally in free production. This makes the credit-assignment window long, which is a further reason exploration must exist from the start.

## 29. Exploration is a Phase 1 requirement

It is tempting to defer randomized exploration, propensity logging, control cohorts, and counterfactual evaluation until the learner models exist and the policy is sophisticated enough to have something worth exploring around. That ordering does not work, and the mistake is expensive because it is invisible until the moment the data is needed.

The reason is confounding by indication. Activities are selected *because of* learner state, so subjunctive drills correlate with poor subjunctive performance — the poor performance is why the drill was shown. Every treatment is entangled with the indication for that treatment. This is not a small bias; it can invert the sign of an estimated effect. And it is not fixable with volume: a hundred million policy-selected rows license exactly the same causal conclusions as a hundred thousand. None.

If Phases 1–3 collect data without randomization, then Phase 4 begins with a large, expensive, causally inert dataset, and §37's moat claim is false.

Exploration is cheap. Concretely, from the first user:

**Near-tie randomization.** Where two or more actions have estimated values within a margin, choose uniformly among them. Near-ties are common, so this yields substantial randomization at almost no cost in learner outcome. Log the propensity.

**Explanation style randomization.** As §20. Free, and the only route to the instructional profile.

**Scheduling jitter.** For ~10% of review items, multiply the scheduled interval by a random factor (e.g. 0.7 / 1.0 / 1.4). Without deliberately off-policy intervals, retention data is censored at exactly the intervals the current scheduler already believes in, and the forgetting model can never discover it is wrong.

**Control cohort.** ~10% of learners on a fixed, well-constructed sequence with standard spaced repetition, indefinitely. This is the only way to answer whether adaptation works at all, and that question does not become less important after launch.

**Propensity logging always.** Action taken, alternatives considered, their estimated values, the selection probability, and an `is_exploration` flag. These fields make off-policy evaluation possible — estimating how a different policy *would* have performed without deploying it — which is what lets the policy improve without endless live experiments.

Total expected cost: a small degradation in short-term learner outcomes, concentrated in cases where the policy was nearly indifferent anyway. Return: the dataset becomes causally interpretable. This trade cannot be made retroactively.

## 30. Guardrails on exploration

Exploration must not be allowed to produce a bad experience.

- Never randomize across a difficulty gap the learner is not ready for; explore among *comparable* actions only.
- Never randomize the correctness of feedback.
- Exclude learners in their first session from all but explanation-style randomization.
- Cap consecutive exploratory actions.
- The control cohort must receive a genuinely good product. A strawman control tells you nothing and is unfair to the learners in it.

---

# Part VII — Input Volume and Modality

## 31. Correction sharpens; input builds

This is a policy constraint, not a stylistic preference.

The architecture described so far is high-diagnosis and low-volume: detect weaknesses, intervene precisely. That is necessary and not sufficient. Language ability is built substantially from large quantities of comprehensible input; targeted correction refines what input has already built. A system optimized purely for error-targeting produces learners with clean grammar and no fluency.

This will not emerge from the policy on its own. The value of input is diffuse, delayed, and hard to attribute to any single text, so a policy optimizing measured concept gaps will consistently under-select it. It must be a budget.

**Concretely:**

- **A fixed share of session time is allocated to input** regardless of estimated weakness. Start at roughly 40% and treat the proportion as an experimental parameter — it is a good early bandit arm.
- **Texts are selected by predicted comprehension**, not by CEFR label. The learner model already contains what is needed to estimate unknown-token proportion per text; target the band where comprehension is high but not total.
- **Reading and listening generate their own evidence**: lookups, re-reads, time on passage, comprehension-check failures, and — valuable and cheap — which words were *not* looked up, which is positive recognition evidence at scale.
- **Input doubles as retention.** Authentic material the learner actually wants to read is the strongest non-gamified reason to return (§34), and it is free, unlimited, and consistent with the positioning in a way generated exercises are not.

## 32. Phonology and speech

Text-first for the MVP is correct scoping. Omitting phonology from the *model* is not.

The typical B1 learner reads adequately and cannot follow speech at natural speed. A system that models competence while ignoring the modality where learners are actually bottlenecked is describing something other than language ability.

The graph therefore includes phonological nodes from the start — phoneme inventory, stress, linking and elision, prosody — even while unpopulated, so that:

- listening comprehension is modeled separately from reading comprehension, which the learner model already distinguishes;
- speech attaches later without restructuring;
- the difficulty model can represent the fact that a word known in writing may be unrecognized in speech.

Speech is a Phase 5 feature and a Phase 1 architectural provision.

---

# Part VIII — Data Architecture

## 33. Every interaction is evidence

Every meaningful interaction becomes an immutable event. Full schema in Appendix A; the essential fields:

```text
event_id · user_id · session_id · occurred_at · schema_version
language · l1_languages · concept_ids · activity_type · item_id
prompt_text · raw_response · response_modality · latency_ms
evaluation · eval_confidence · diagnosis_code · diagnosis_confidence
evaluator_version · generator_version
policy_action · policy_candidates · propensity · is_exploration
exposure_context · evidence_weight
```

Three properties matter more than the rest.

**Raw responses are retained.** This is what makes re-scoring possible when the evaluator improves. Events are immutable; *derived labels must not be*. Storing only the label freezes today's evaluator error into the permanent record.

**Policy fields are present from event one.** `policy_candidates`, `propensity`, `is_exploration`. Adding them later means the earlier data is causally useless, which is the whole of §29.

**Schema is versioned.** `schema_version` on every row. Migrations are additive; fields are never repurposed.

## 34. Storage: Postgres first, Parquet on a threshold

Parquet is the right long-term format and the wrong day-one implementation. An MVP generates thousands of events per day. Writing Parquet per interaction creates the small-file problem — many tiny files, slow queries, compaction work — in exchange for no benefit, because DuckDB queries a Postgres table of that size instantly.

**Path:**

1. **Append-only `events` table in Postgres.** Same schema, no `UPDATE`, no `DELETE`, enforced by permissions rather than convention.
2. **Nightly batch export to partitioned Parquet** in object storage, triggered when sustained volume exceeds roughly 10M rows or when analytical queries exceed a few seconds — whichever comes first.
3. **DuckDB and Polars over Parquet** thereafter.

```text
glotty-data/events/language=es/year=2026/month=09/day=01/*.parquet
glotty-data/learner_states/language=es/snapshot_date=2026-09-01/*.parquet
```

Parquet's advantages — columnar storage, compression, analytical performance, Python-native tooling, cheap object storage, reproducibility, dataset versioning — all hold. They apply at a scale the MVP does not have. Nothing is lost by deferring, because **the value is in the schema, and the schema exists from day one.**

Postgres retains transactional application state: users, accounts, authentication, subscriptions, payments, permissions, sessions.

## 35. Derived state is reproducible

The learner model is a **materialized view over the event log**, not an authoritative record.

```text
events (immutable, raw)
   ↓  evaluator vN
labels (derived, versioned)
   ↓  mastery model vM
learner_state (derived, versioned, snapshotted)
```

Any learner's state at any past date must be reconstructible from events plus model versions. This gives three things: safe model replacement without data loss, the ability to re-score history when the evaluator improves, and honest backtesting — you can ask what a new mastery model would have predicted, using only information available at the time.

Learner state is snapshotted daily for query performance, never treated as the source of truth.

## 36. Architecture

```text
                    User Experience
                          │
                          ▼
                   AI Orchestrator
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
  Learner Model    Knowledge Graph      Retrieval
        │                 │                 │
        └─────────────────┼─────────────────┘
                          ▼
                  Learning Objective
                          ▼
              Learning Policy (+ exploration)
                          ▼
              Generated / Selected Experience
                          ▼
                      New Event
                          └────────────────↺
```

The LLM is not the learner model and not the source of truth. It is one reasoning and generation component operating over a persistent learning system.

**Component separation is enforced by interface contracts**, so that a generator can be replaced without touching the learner model, an evaluator can improve without changing the product surface, the mastery model can be swapped without losing historical evidence, and the policy can grow sophisticated without altering the data architecture.

**Two abstractions matter above the rest.** The **model gateway** — no product logic hard-coded to one LLM provider, ever. The **evaluator interface** — versioned, independently testable, and re-runnable over historical raw responses as a batch job.

## 37. The historical record

A mature dataset contains, for every intervention: what the learner saw, what they answered, what they misunderstood, which explanation they received, which intervention was selected, what alternatives existed with what estimated values, the selection propensity, the system's confidence, and what happened afterward at multiple intervals.

**With §29's exploration in place**, this answers causal questions: which activity types produce durable retention, which explanations work for which learner states, how many successful retrievals precede reliable production, whether conversational exposure improves spontaneous production, which intervention best follows a specific misconception.

Two honest caveats.

**The moat is narrower than it appears.** Much of what this establishes about forgetting curves and retrieval practice is in the public literature, readable by competitors. The defensible part is the interaction between *specific interventions* and *specific learner states* at fine granularity — real, but a smaller claim than owning language-learning data.

**It compounds slowly.** Answering "which explanation for which learner" at concept granularity needs many learners per cell. This is a year-three asset. It should not be load-bearing in early strategy, and it is not a reason to delay shipping.

---

# Part IX — Retention and Session Design

## 38. Why people return

Not streaks, lives, or points. The loop:

```text
Glotty notices something → learner discovers something
    → learner improves → Glotty notices the improvement
    → learner sees their model becoming richer
    → learner wants to know what comes next
```

The reward: *I'm becoming someone who understands this language.*

This is the right aesthetic and it is not yet a proven retention mechanism, so it is an explicit MVP metric with a target set in advance, not an assumption (§44).

The competitive frame matters. This audience's substitutes are not Duolingo; they are an iTalki tutor, an Anki deck, a podcast, and reading novels in the target language. Those are cheap, effective, and already habitual. Glotty must beat those.

## 39. Visible model growth

```text
Your Spanish

Vocabulary       █████████░
Reading          ██████████
Grammar          ███████░░░
Conversation     ██████░░░░
Spontaneous use  █████░░░░░

Recent discoveries:
✓ Narrative aspect
✓ Direct object pronouns
→ Subjunctive triggers
→ Beneficiary vs purpose
```

Showing the model does three things at once. It is the intrinsic-motivation analogue of a progress bar, and honest, because what's displayed is real. It creates a correction channel — a learner who knows an estimate is wrong can say so, and that disagreement is high-value evidence. And it forces calibration honesty: visibly wrong numbers surface immediately rather than after a year of accumulating miscalibrated data.

Display uncertainty alongside estimates. *Probably weak, but I've only seen six attempts* is more useful and more honest than a bare percentage.

## 40. Authentic content unlocks

As comprehension grows, Glotty opens increasingly difficult authentic material — selected because the model predicts *this learner* can extract value from it, not because it carries a level label. The reward for progress is access to things worth reading, which is why most of these learners started.

## 41. Session completeness

Sessions have a beginning, a middle, and an end.

**Beginning** — *Here's what we're working on today.*
**Middle** — natural interaction and targeted practice.
**End** — *Here's what I learned about you today*, then *here's what I think we should do next time.*

The closing frame does real work: it makes the next session's plan visible, so the pull to return is curiosity about Glotty's reasoning rather than fear of losing a streak. That only works if the policy is actually good, which is the correct incentive.
---

# Part X — MVP

## 42. Scope

**Language pair:** English → Spanish
**Learner band:** B1
**Concept clusters:** preterite vs imperfect; *por* vs *para*

These two clusters are rich enough to demonstrate the thesis. Both have a real conceptual core rather than an arbitrary rule set, both are notoriously resistant to rote learning, both show a large recognition-production gap, and both produce errors that are visible in free conversation. They are the clusters most likely to generate a genuine *"how did it know that?"*

**Explicitly out of MVP scope:** additional languages, speech and pronunciation, the full Spanish graph, learned policy, Parquet, mobile apps, and the social layer.

## 43. First session

**1 — Conversation.** *Tell me about something interesting that happened recently.* The learner writes several sentences in Spanish.

**2 — Silent observation.** Glotty records tense selection, vocabulary, syntax, recurring patterns, latency, production gaps. The conversation continues naturally.

**3 — Calibrated framing.** Not yet an insight — the gate blocks it in session one. Instead: *Here's my starting guess about your Spanish, and here's what I'll be watching.*

**4 — Targeted intervention.** Three narrative situations selected against the current hypothesis.

**5 — Re-test.** The learner produces new sentences.

**6 — Memory.** Future observations scheduled by predicted retrievability.

**7 — Continuity.** Next time: *Last time your narrative tense looked unstable. Let's see whether it's changed.*

By roughly session three, with enough evidence to pass the gate, this becomes the full experience:

> **I noticed something.** You understand the preterite/imperfect difference when choosing between them. But telling a story spontaneously, you collapse both into the preterite. This isn't a recognition problem. It's a production problem.

---

# Part XI — Roadmap and Gates

Each phase ends with numeric criteria. A phase does not end because time has passed.

## Phase 1 — Prove the evaluator and the insight

**Build:** MVP concept graph (~40 nodes); diagnostic taxonomy (Appendix B); gold standard dataset; dual-path evaluator; basic learner state with uncertainty; conversation and production interface; event logging with the complete schema; **randomization and propensity logging from the first user**; control cohort.

**Critical question:** *Can Glotty tell a learner something genuinely useful about their language that they did not already know — and be right?*

**Gates:**

- Inter-annotator κ ≥ 0.75 binary, ≥ 0.60 diagnosis
- Evaluator held-out accuracy ≥ 0.90; precision on INCORRECT ≥ 0.95
- Diagnosis top-1 ≥ 0.65 given INCORRECT
- Sync path p95 < 200ms
- ≥ 50% of surfaced insights rated useful; ≤ 3% rated wrong
- ≥ 60% of learners receive at least one gate-passing insight within three sessions

The last gate is the one that decides whether the product exists. If most learners cannot be told anything true and specific within three sessions, either the clusters are too narrow, the gate is too strict, or the thesis needs revisiting — and it is much better to learn that in month three than month eighteen.

## Phase 2 — Remember everything

**Build:** batch Parquet export on the volume threshold; evaluator versioning and historical re-scoring; learner-state reconstruction and daily snapshots; analytics on DuckDB.

**Critical question:** *Can Glotty remember and use months of history?*

**Gates:** any learner state reconstructible from events for any past date; full corpus re-scoring under a new evaluator version completing within one batch window; re-scoring shown to change learner-state estimates without data loss.

## Phase 3 — Learn the learner

**Build:** FSRS/DSR retention; BKT or IRT mastery with hierarchical pooling; difficulty prediction; misconception classification. Model candidates, not architectural commitments.

**Critical question:** *Can Glotty predict what the learner knows and what they will forget?*

**Gates:** calibration error below a set threshold across the probability range, with reliability diagrams reported; forgetting prediction beating a fixed-interval baseline on held-out reviews; mastery prediction beating a last-observation baseline.

Calibration is the gate that matters. An uncalibrated model makes the insight gate meaningless, because a stated posterior of 0.75 no longer means anything.

## Phase 4 — Learn how to teach

**Build:** contextual bandits over the intervention set; counterfactual and off-policy evaluation; intervention utility models. *Exploration infrastructure already exists from Phase 1 — this phase consumes it.*

**Critical question:** *Can Glotty learn which intervention produces the greatest durable improvement?*

**Gates:** off-policy estimates validated against a live A/B; learned policy beating the rule-based policy on the 14-day durable-mastery objective; at least one intervention effect estimated with sufficient precision to change the policy.

## Phase 5 — Expand the interface

**Build:** listening, speech, pronunciation, phonological modeling, authentic media, richer conversation.

The graph already contains phonological structure, so these attach to the existing model rather than requiring a restructure.

---

# Part XII — Validation

## 44. The Phase 1 experiment

Without a controlled outcome, "adaptive" is not falsifiable.

**Design.** Two arms, randomized at the learner level, six weeks.

- **Arm A** — Glotty adaptive.
- **Arm B** — a fixed, well-constructed sequence over the same two clusters, with FSRS-scheduled review.

Arm B must be genuinely good. The honest benchmark is a strong static curriculum plus spaced repetition, which is roughly what a competent self-directed learner already does. A strawman control produces a flattering result and no information.

**Primary outcome.** Spontaneous production accuracy on the target clusters, measured by a narrative elicitation task at week 6, human-scored blind to arm.

**Secondary.** Durability at week 10. Calibration (Brier score, reliability diagram). Week-4 retention. Insight usefulness and wrong-insight rates. Recognition-production gap change.

**Sizing.** Detecting a moderate effect (d ≈ 0.5) at 80% power and α = 0.05 requires roughly 64 completers per arm; recruit ~90 per arm against attrition. Attrition will be substantial and differential attrition is itself a finding — if Arm A retains better and learns equally, that is a real result.

**Pre-register** the primary outcome, the analysis, and the success threshold before data collection. The temptation to find a favourable secondary outcome after the fact will be strong.

## 45. Budgets

**Latency.**

| Path | Target | Composition |
|---|---|---|
| Conversational turn | p95 < 1.5s | Streamed generation |
| Sync evaluation | p95 < 200ms | No LLM: key match, morphology, small classifier |
| Async evaluation | < 60s | Batched LLM |
| Session-end insight | < 5s | Precomputed during session |

The 200ms budget forbids an LLM in the synchronous path. This constrains item generation: every generated item must carry a stored answer key, produced and validated at generation time.

**Cost.** An order-of-magnitude sketch, with assumptions stated because the numbers move:

A 20-minute session yields roughly 30 evaluable turns. At current mid-tier API pricing, asynchronous evaluation at a few thousand tokens per turn lands in the region of $0.20–0.35 per session; generation and conversation add a similar amount. Call it **$0.30–0.60 per session**, or **$6–12 per active user per month** at 20 sessions — before infrastructure.

Two consequences. Pricing must sit meaningfully above that, which points to a subscription in the $15–25 range rather than a freemium model with a generous free tier. And routing matters: the cheapest large reduction is sending routine evaluations to a small model and reserving the large model for uncertain cases and diagnosis. The model gateway is what makes that possible, which is why it is a day-one abstraction rather than a nicety.

Model pricing and capability change quickly; these figures should be re-derived at implementation rather than trusted.

## 46. Metrics

**Learning** — long-term retention; productive mastery; transfer to novel contexts; spontaneous usage; reduction in recurring misconceptions.

**Model quality** — evaluator accuracy and INCORRECT precision; calibration; uncertainty quality; mastery and forgetting prediction accuracy; `UNKNOWN` diagnosis rate.

**Product** — week-4 and week-12 retention; session completion; return frequency; conversation frequency.

**Primary product metric:** *percentage of sessions producing an insight the learner rates as useful.*

**Primary safety metric:** *percentage of surfaced insights the learner marks as wrong.* This one has a hard ceiling (§11), and it is the metric that protects everything else.

Explicitly not optimized: lessons completed, XP, streak length, exercises per session.

## 47. The Glotty Standard

Every significant feature passes three tests.

1. **Does Glotty know something about this learner?** If not, it is generic content.
2. **Does that knowledge change what happens next?** If not, the personalization is cosmetic.
3. **Does the learner notice the difference?** If not, the intelligence is invisible and has limited product value.

The ultimate test: *could this experience have been produced by a good textbook, an Anki deck, a generic chatbot, or a grammar checker?* If yes, it is not sufficiently Glotty.

---

# Part XIII — Execution

## 48. Team

The minimum viable team for Phase 1:

| Role | Commitment | Why |
|---|---|---|
| Backend / ML engineer | Full | Event pipeline, evaluator, learner model |
| Full-stack engineer | Full | Conversation interface, session experience |
| **Applied linguist** | ~half | Taxonomy, rubrics, gold set annotation, item review |
| Designer | ~half | Insight presentation, model visualization |

The linguist is the non-obvious hire and the one most likely to be skipped. The diagnostic taxonomy and the gold standard dataset cannot be produced by engineers, and they gate everything else. A second annotator is needed for inter-annotator agreement and can be contracted.

## 49. Build order

The dependency structure forces a sequence:

1. **Taxonomy and gold set.** Nothing downstream is trustworthy until the evaluator is measured against them.
2. **Event schema and concept IDs.** Every subsequent decision writes into these, and both are expensive to change afterward.
3. **Evaluator**, to its acceptance gates.
4. **Learner model** over evaluated events.
5. **Rule-based policy with exploration.** A hand-written policy with proper randomization produces better data than a sophisticated policy without it.
6. **Conversation, content, and insight surfacing.**
7. **Learned policy**, only once exploration data exists.

The temptation is to start at step 6, because it demos well and the earlier steps are invisible. A compelling demo on an unmeasured evaluator produces a year of unusable data and an insight feature that is confidently wrong.

## 50. Risks

**Evaluator accuracy may cap the product.** If free-form evaluation plateaus below what diagnosis requires, Glotty is limited to constrained item types — a good spaced-repetition system, not the thing described here. *Most important risk, and cheaply resolvable: the gold set answers it before significant engineering investment.*

**Adaptation may not beat good static sequencing by enough to matter.** A strong fixed curriculum plus spaced repetition is a hard baseline. The difference must be large enough for learners to feel. §44 tests it.

**The magic may not survive contact with real learners.** Insights may be true and boring, or interesting and wrong. §11's dual metrics detect both, but neither is guaranteed to be achievable.

**The audience is structurally hard to retain.** Effective substitutes, high standards, low tolerance for filler. Part IX proposes mechanisms; none is validated.

**Cold start is thin.** Before evidence accumulates, Glotty is a well-designed generic app. §12 makes this honest rather than hidden, but the first two sessions decide whether there is a third.

**Unit economics may not close.** §45 suggests COGS that require real subscription pricing. If the target audience will not pay $20/month, model routing and caching must do heavier work than currently assumed.

**Linguistic resource coverage.** Dictionaries, frequency lists, corpora, morphological databases, and quality example sentences are uneven across languages and licences. Unglamorous, and it constrains which languages ship when.

---

# Final Thesis

Glotty is not fundamentally a vocabulary app, a grammar app, an AI tutor, or a conversation app.

It is a **system that learns how you learn a language.**

The more you use it, the more precisely it understands what you know, what you don't, what you *think* you know, what you almost know, what you repeatedly confuse, how you best understand explanations, what you forget, what you can recognize but cannot produce, and which interventions actually change your ability.

The technology makes this possible. The learner experiences something much simpler:

> **Glotty pays attention.**

And occasionally:

> **"How did it know that?"**

That feeling is the product. Everything in this document exists to make it earned rather than asserted.

---
---

# Appendix A — Event Schema

```sql
CREATE TYPE evaluation_result AS ENUM ('correct','incorrect','uncertain','unscored');
CREATE TYPE activity_kind AS ENUM (
  'cloze','forced_choice','transformation','constrained_production',
  'free_production','conversation_turn','reading','listening',
  'explanation_view','diagnostic_item'
);
CREATE TYPE exposure_kind AS ENUM ('drill','conversation','reading','review','diagnostic');

CREATE TABLE events (
  event_id            uuid PRIMARY KEY,
  schema_version      smallint     NOT NULL,
  user_id             uuid         NOT NULL,
  session_id          uuid         NOT NULL,
  occurred_at         timestamptz  NOT NULL,

  -- linguistic context
  language            text         NOT NULL,   -- BCP-47, e.g. 'es'
  l1_languages        text[]       NOT NULL,   -- learner repertoire
  concept_ids         text[]       NOT NULL,   -- see §18 convention

  -- the interaction
  activity_type       activity_kind NOT NULL,
  item_id             uuid,                    -- null for free conversation
  prompt_text         text,
  raw_response        text,                    -- NEVER discarded
  response_modality   text         NOT NULL,   -- text | speech | choice
  latency_ms          integer,

  -- evaluation (derived, re-computable)
  evaluation          evaluation_result NOT NULL,
  eval_confidence     real,
  diagnosis_code      text,                    -- taxonomy code or 'UNKNOWN'
  diagnosis_confidence real,
  evaluator_version   text         NOT NULL,
  eval_path           text         NOT NULL,   -- sync | async

  -- provenance
  generator_version   text,
  item_answer_key     jsonb,                   -- stored at generation time

  -- policy and causal identification
  policy_action       text         NOT NULL,
  policy_candidates   jsonb        NOT NULL,   -- [{action, est_value}]
  propensity          real         NOT NULL,   -- P(chosen | state)
  is_exploration      boolean      NOT NULL,
  exploration_type    text,                    -- near_tie | style | jitter | control
  cohort              text         NOT NULL,   -- adaptive | control

  -- weighting
  exposure_context    exposure_kind NOT NULL,
  evidence_weight     real         NOT NULL    -- see §16
);

CREATE INDEX ON events (user_id, occurred_at DESC);
CREATE INDEX ON events USING gin (concept_ids);
CREATE INDEX ON events (evaluator_version) WHERE evaluation <> 'unscored';
CREATE INDEX ON events (occurred_at) WHERE is_exploration;

REVOKE UPDATE, DELETE ON events FROM app_role;  -- immutability enforced, not assumed
```

**Notes.** `raw_response` retention is what makes re-scoring possible. `policy_candidates`, `propensity`, and `is_exploration` must be populated from the first event. `item_answer_key` is stored at generation time because the synchronous path has no LLM to derive it. Immutability is a permission, not a convention.

---

# Appendix B — Diagnostic Taxonomy (MVP)

Fifteen codes plus `UNKNOWN`. Each requires a definition, positive examples, **negative examples**, a **distinguishing probe** separating it from its nearest neighbour, and an intervention family. Two are worked out in full below as the template; the remainder are specified at the same level of detail during Phase 1.

### Preterite / Imperfect

| Code | Misconception |
|---|---|
| `PI.01` | Background/foreground inversion — preterite used for scene-setting description |
| `PI.02` | Lexical trigger overgeneralization — *ayer*, *una vez* mechanically force preterite |
| `PI.03` | Durative-verb default — inherently durative verbs pushed to imperfect regardless of bounding |
| `PI.04` | Habitual past mapped to preterite |
| `PI.05` | State-verb aspect shift not acquired — *sabía*/*supe*, *conocía*/*conocí*, *quería*/*quiso* |
| `PI.06` | Narrative flattening — all events in preterite, including interrupted ones |
| `PI.07` | L1 transfer — English past progressive mapped mechanically to imperfect |
| `PI.08` | Bounded duration misread as ongoing — *estuve dos años* rendered as *estaba* |

**`PI.01` — Background/foreground inversion** *(template)*

*Definition.* The learner selects the preterite for clauses providing background or descriptive context within a narrative, reserving no aspectual contrast for foregrounded events.

*Positive.* `*Cuando fui joven, jugué al fútbol todos los días.` — habitual background in preterite.
`*Hacía frío y llovió cuando salí.` — descriptive background split inconsistently.

*Negative — do not code as PI.01.* `Ayer iba al supermercado y compré leche.` — **correct**; the trip is backgrounded and the purchase foregrounded. `La fiesta fue divertida.` — **correct**; bounded evaluation of a completed event, not background description.

*Distinguishing probe (vs `PI.06`).* Present a two-clause item where background and foreground are both explicit: `Mientras ___ (caminar) al trabajo, me ___ (llamar) Ana.` `PI.01` fails the first blank; `PI.06` fails both toward preterite. If the learner produces `caminaba` correctly here but flattens in free narrative, the diagnosis is production access, not conceptual — a different intervention entirely.

*Intervention family.* Contrastive narrative construction; explicit foreground/background framing; guided story production with scaffolded scene-setting.

### Por / Para

| Code | Misconception |
|---|---|
| `PP.01` | Beneficiary/purpose conflation — *lo hice por ti* vs *lo hice para ti* |
| `PP.02` | Motion: route vs destination — *pasamos por Madrid* vs *salimos para Madrid* |
| `PP.03` | Cause vs goal — motive (*por*) collapsed into purpose (*para*) |
| `PP.04` | Duration vs deadline — *por dos horas* vs *para el lunes* |
| `PP.05` | Exchange/substitution unrecognized — *pagué veinte euros por el libro* |
| `PP.06` | Undifferentiated L1 "for" — no semantic partition at all |
| `PP.07` | Fixed expression treated as rule-derived — *gracias por*, *por favor* reasoned about rather than known lexically |

**`PP.01` — Beneficiary/purpose conflation** *(template)*

*Definition.* The learner does not distinguish acting *on behalf of / because of* someone (*por*) from producing something *destined for* someone (*para*), treating both as a single beneficiary relation.

*Positive.* Learner renders "I did it for you (in your place)" as `*lo hice para ti` when substitution is intended; or "I made you a cake" as `*hice un pastel por ti`.

*Negative — do not code as PP.01.* `Trabajo para una empresa española` — **correct**, employment. `Gracias por la ayuda` — fixed expression; code `PP.07` if the learner is deriving it from a rule rather than knowing it lexically.

*Distinguishing probe (vs `PP.06`).* Present three items separating beneficiary, cause, and purpose:
`Lo hice ___ ti.` / `Trabajo ___ una empresa española.` / `Estudio español ___ poder hablar con mis clientes.`
`PP.01` fails the first while handling the third; `PP.06` shows no pattern across all three. **This distinction is essential** — the interventions diverge completely. `PP.01` needs a narrow contrastive treatment; `PP.06` needs the whole semantic partition built from scratch, and giving a `PP.06` learner the `PP.01` treatment will simply confuse them.

*Intervention family.* Minimal-pair contrast holding the verb constant; explicit beneficiary/substitution framing; production items forcing the distinction.

### `UNKNOWN`

Mandatory. Errors matching no code are logged as `UNKNOWN` with the raw response and reviewed in batch. This is the primary input to taxonomy versioning; a rising `UNKNOWN` rate signals drift between the taxonomy and real learner behaviour.

---

# Appendix C — MVP Concept Graph

Approximately 40 nodes. Illustrative core:

```text
es.gram.aspect.pret_imp              [target cluster]
├── prerequisite → es.gram.pret.regular_forms
├── prerequisite → es.gram.imp.regular_forms
├── prerequisite → es.gram.pret.irregular_high_freq
├── contrasts_with → es.gram.aspect.perfect
├── instance_of → es.gram.tense_aspect_system
└── enables → es.disc.narrative_competence

es.sem.por_para                      [target cluster]
├── instance_of → es.sem.prepositional_semantics
├── children: beneficiary · purpose · cause · route
│             destination · duration · deadline · exchange
├── interferes_with ← en.sem.for_undifferentiated
└── contrasts_with → es.sem.a_vs_en

es.disc.narrative_competence
├── prerequisite → es.gram.aspect.pret_imp
├── prerequisite → es.disc.temporal_connectors
└── prerequisite → es.lex.time_expressions

es.phon.*                            [defined, unpopulated until Phase 5]
├── es.phon.stress.penultimate
├── es.phon.linking.vowel_sequences
└── es.phon.prosody.declarative
```

Each node carries: canonical ID, human label, domain, CEFR band, applicable diagnostic codes, item-pool reference, and prerequisite closure.

---

# Appendix D — Acceptance Gates

| Phase | Gate | Threshold |
|---|---|---|
| 1 | Inter-annotator κ (binary) | ≥ 0.75 |
| 1 | Inter-annotator κ (diagnosis) | ≥ 0.60 |
| 1 | Evaluator held-out accuracy | ≥ 0.90 |
| 1 | **Precision on INCORRECT** | **≥ 0.95** |
| 1 | Diagnosis top-1 given INCORRECT | ≥ 0.65 |
| 1 | UNCERTAIN rate | ≤ 15% |
| 1 | Sync evaluation p95 latency | < 200ms |
| 1 | Insights rated useful | ≥ 50% |
| 1 | **Insights rated wrong** | **≤ 3%** |
| 1 | Learners with ≥1 gate-passing insight by session 3 | ≥ 60% |
| 2 | Learner state reconstructible for any past date | Yes/no |
| 2 | Full re-scoring within one batch window | Yes/no |
| 3 | Calibration error across probability range | Below set threshold |
| 3 | Forgetting prediction vs fixed-interval baseline | Beats it |
| 3 | Mastery prediction vs last-observation baseline | Beats it |
| 4 | Off-policy estimates validated against live A/B | Within stated CI |
| 4 | Learned policy vs rule policy on 14-day objective | Beats it |
| — | **Phase 1 experiment: Arm A vs Arm B production accuracy** | **Pre-registered threshold** |

The two bolded Phase 1 gates protect learner trust. The final row decides whether the central thesis holds.
