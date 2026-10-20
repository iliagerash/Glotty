# Glotty

An AI-first Spanish tutor for English speakers. The spec is [`Glotty_Concept.md`](Glotty_Concept.md). [`REVIEW.md`](REVIEW.md) explains why the first implementation was rebuilt.

**AI-first, as built here:** the LLM writes everything the learner reads and interprets everything the learner writes. Learner state, the insight gate, the policy and the event log are deterministic code. The LLM proposes and reads; the code decides and records.

## Where things stand

The rebuild follows the concept's build order (§49). Each step is gated by measurement, not by a demo.

| Step | Status |
|---|---|
| 0. Remove simulated evaluator, scripted journey, demo dashboards, fake user | done |
| 1. Model gateway (`src/lib/ai`): provider-agnostic, schema-validated, no silent fallback | done |
| 2. Evaluator (`src/lib/evaluator`, `prompts/evaluator/v4.md`), gold-set tooling, benchmark | built; **not yet measured** |
| 3. Generated items with stored answer keys and distinguishing probes; sync evaluation | next |
| 4. LLM conversation turns, async evaluation queue, versioned `labels` table | |
| 5. Learner model from labels (§16 weights, ordering constraint, pooled prior); real gate inputs | |
| 6. Policy drives the tutor; real propensities, cohorts, explanation-style randomization | |
| 7. Session framing, insight phrasing, feedback loop | |

The database is Cloudflare D1 (SQLite). The `events` table is append-only: triggers reject `UPDATE` and `DELETE` (`src/db/migrations/0001_events_immutable.sql`).

`Implementation_Plan.html` describes the first attempt (Gemini 1.5) and is superseded by this table.

## Setup

```bash
npm install
cp .env.example .env        # the Cloudflare credentials; GLOTTY_MODEL_FAST/STRONG are required
npm run db:migrate && npm run db:seed   # local D1 under .wrangler/
npm run dev                 # next dev, with the local D1 bound as DB
npm run ai:models           # check which Workers AI models your account can use
npm run ai:ping             # one evaluator call per tier
```

## Deploy (Cloudflare Workers)

The app runs on Workers through OpenNext (`@opennextjs/cloudflare`), with D1 as its database (binding `DB` in `wrangler.jsonc`). Offline scripts (`gold:*`, `bench`) are not deployed.

```bash
cp .dev.vars.example .dev.vars && npm run preview   # production build in the local Workers runtime
npx wrangler login                                  # or CLOUDFLARE_API_TOKEN with Workers Scripts and D1 edit rights
npx wrangler d1 create glotty                       # once; put the printed id in wrangler.jsonc
npx wrangler secret put BETTER_AUTH_SECRET          # and BETTER_AUTH_URL (the deployed URL)
npx wrangler secret put GLOTTY_ANNOTATOR_EMAILS     # who may use /annotate and /adjudicate
npm run db:migrate:remote && npm run db:seed -- --remote && npm run gold:push -- --remote
npm run deploy
```

After changing `src/db/schema.ts`, run `npx drizzle-kit generate` and apply the new migration with `npm run db:migrate`. After changing bindings in `wrangler.jsonc`, run `npm run cf-typegen`.

## Evaluator workflow

Two layers of models:

- **Product** (`src/lib/ai`): Cloudflare Workers AI through the provider-agnostic gateway. This is the evaluator learners face, and everything else at runtime.
- **Governance** (`src/lib/governance`): one judge model through the official OpenAI SDK and Responses API (`OPENAI_API_KEY`, `GLOTTY_GOVERNANCE_MODEL`, optional `GLOTTY_GOVERNANCE_EFFORT`). It writes gold candidates and labels them, offline only. Keeping it separate means the judge can't silently become one of the models it judges.

The default loop needs no human labelling:

```bash
npm run gold:generate -- --governance --per-code 6           # candidates, add --kinds error,error,... for more errors
npm run gold:label -- --runs 2                                # judge labels every item twice -> model_labels/<model>-i<N>.jsonl
npm run bench -- --models fast,strong --against model:<model>-i<N>
```

`gold:label` resumes where it stopped. Where the two runs disagree, the item becomes "uncertain", so the evaluator should abstain on it. Results are model-judged, not checked by people: reports say so, and a native-speaker check stays open before anything ships. The human tools below (`/annotate`, `/adjudicate`) remain for spot checks.

The reference label set is `gpt-6-luna-i4`. The earlier human labels (`annotations/illia.jsonl`) and adjudications were discarded on 2026-10-20 as unreliable; they stay in git history only.

1. **Draft candidates** (optional): `npm run gold:generate -- --per-code 6`. The LLM writes realistic B1 responses, including hard look-alikes and ambiguous cases. Its intended labels go to `data/gold/generator_intent.jsonl` and are never shown to annotators.
2. **Annotate**: open `/annotate` (locally with `npm run dev`, or on the deployed app) and sign in. Only accounts listed in `GLOTTY_ANNOTATOR_EMAILS` may annotate; locally, an unset list lets any signed-in account in. Follow [`data/gold/GUIDELINES.md`](data/gold/GUIDELINES.md). Add real learner writing there too: §24 wants real responses, and synthetic items are only a bootstrap.
   - **Where labels live**: the app reads and writes the gold set in D1. `npm run gold:push` copies items and combined model label sets from `data/gold` to D1 (run it after `gold:generate` or `gold:label`); `npm run gold:pull` writes human labels to `data/gold/annotations/<name>.jsonl` and `adjudications.jsonl`, and appends items added in the app to `items.jsonl`, for the offline scripts. Commit what pull writes. Add `-- --remote` for the deployed database.
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
