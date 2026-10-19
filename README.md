# Glotty

An AI-first Spanish tutor for English speakers. The spec is [`Glotty_Concept.md`](Glotty_Concept.md). [`REVIEW.md`](REVIEW.md) explains why the first implementation was rebuilt.

**AI-first, as built here:** the LLM writes everything the learner reads and interprets everything the learner writes. Learner state, the insight gate, the policy and the event log are deterministic code. The LLM proposes and reads; the code decides and records.

## Where things stand

The rebuild follows the concept's build order (§49). Each step is gated by measurement, not by a demo.

| Step | Status |
|---|---|
| 0. Remove simulated evaluator, scripted journey, demo dashboards, fake user | done |
| 1. Model gateway (`src/lib/ai`): provider-agnostic, schema-validated, no silent fallback | done |
| 2. Evaluator (`src/lib/evaluator`, `prompts/evaluator/v3.md`), gold-set tooling, benchmark | built; **not yet measured** |
| 3. Generated items with stored answer keys and distinguishing probes; sync evaluation | next |
| 4. LLM conversation turns, async evaluation queue, versioned `labels` table | |
| 5. Learner model from labels (§16 weights, ordering constraint, pooled prior); real gate inputs | |
| 6. Policy drives the tutor; real propensities, cohorts, explanation-style randomization | |
| 7. Session framing, insight phrasing, feedback loop | |

The `events` table is append-only: a trigger rejects `UPDATE`, `DELETE` and `TRUNCATE` (`src/db/migrations/0001_events_immutable.sql`).

`Implementation_Plan.html` describes the first attempt (Gemini 1.5) and is superseded by this table.

## Setup

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL and the Cloudflare credentials; GLOTTY_MODEL_FAST/STRONG are required
npm run db:migrate && npm run db:seed
npm run ai:models           # check which Workers AI models your account can use
npm run ai:ping             # one evaluator call per tier
```

## Evaluator workflow

1. **Draft candidates** (optional): `npm run gold:generate -- --per-code 6`. The LLM writes realistic B1 responses, including hard look-alikes and ambiguous cases. Its intended labels go to `data/gold/generator_intent.jsonl` and are never shown to annotators.
2. **Annotate**: `npm run dev` and open `/annotate`. Follow [`data/gold/GUIDELINES.md`](data/gold/GUIDELINES.md). Labels are saved per annotator in `data/gold/annotations/<name>.jsonl`; commit them. Add real learner writing there too: §24 wants real responses, and synthetic items are only a bootstrap.
   - **Model labels** (to save annotation time): `npm run gold:model-export` writes `data/gold/handoff/items.jsonl` and `instructions.md` for an external model such as ChatGPT. Import its answer with `npm run gold:model-import -- --name chatgpt-<model> --file labels.jsonl`; it lands in `data/gold/model_labels/`, never among human annotations. `npm run gold:model-compare -- --model chatgpt-<model>` measures agreement with each human annotator; `--subset tune|check` splits the items so instructions are tuned on one half and measured on the other, and `--annotator model:<other>` compares two runs of the model. Only if it meets the human bar (κ ≥ 0.75 evaluation, ≥ 0.60 diagnosis) use `npm run bench -- --against model:chatgpt-<model>` for prompt iteration on `dev`. Held-out reports still need human labels.
   - **One human plus a model** (until a second qualified annotator exists): items where the human and model labels agree count as provisional gold. Disagreements are settled at `/adjudicate`: the two labels appear as A and B, and each decision must name the rule from `data/gold/rules.json` that settles it, or mark the item contested (kept out of gold). Run the benchmark on this gold with `npm run bench -- --consensus chatgpt-v2`.
3. **Benchmark**: `npm run bench -- --models fast,strong,cloudflare:@cf/...`. This runs the `dev` split against human labels and reports the §25 gates, false accusations, latency and tokens in `reports/bench/<run>/report.md`. Iterate prompts on `dev` only; run `--split heldout` to report.
   - Before any annotation exists, `--against intent` screens models against the generator's intended labels. The report says plainly that this is not a gold measurement.
   - Reasoning models take an effort suffix, e.g. `cloudflare:@cf/openai/gpt-oss-120b#low` (sent as `reasoning_effort`). `CLOUDFLARE_CANDIDATES` in `src/lib/ai/config.ts` lists the models checked to work, with the suffix each needs. For the tiers, put the effort in `GLOTTY_EFFORT_FAST`/`GLOTTY_EFFORT_STRONG` instead: `#` starts a comment in `.env` files and environment settings, which drops the suffix. If a reasoning model spends the whole token budget thinking, the gateway fails with a message saying so; it never reads the answer out of the reasoning text.
4. **Agreement**: with a second annotator, the report computes Cohen's κ (§25: ≥ 0.75 binary, ≥ 0.60 diagnosis). With one annotator, results are reported as provisional.

## Tests

```bash
npm test            # unit tests (gateway is tested against a mocked fetch)
npm run typecheck
```
