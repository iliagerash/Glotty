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
npm run db:migrate:remote && npm run db:seed -- --remote
npm run deploy
```

After changing `src/db/schema.ts`, run `npx drizzle-kit generate` and apply the new migration with `npm run db:migrate`. After changing bindings in `wrangler.jsonc`, run `npm run cf-typegen`.

## Evaluator workflow

Two layers of models:

- **Product** (`src/lib/ai`): Cloudflare Workers AI through the provider-agnostic gateway. This is the evaluator learners face, and everything else at runtime.
- **Governance** (`src/lib/governance`): two judge models from different families, each through its provider's official SDK. They write gold candidates and label them, offline only. Keeping them separate means a judge can't silently become one of the models it judges.
  - Judge a, OpenAI Responses API: `OPENAI_API_KEY`, `GLOTTY_GOVERNANCE_MODEL`, optional `GLOTTY_GOVERNANCE_EFFORT`.
  - Judge b, Google Gen AI SDK (Gemini): `GEMINI_API_KEY`, `GLOTTY_GOVERNANCE_MODEL_B`, optional `GLOTTY_GOVERNANCE_EFFORT_B` (minimal, low, medium or high).

No human labels anything. Gold is where both judges agree:

```bash
npm run gold:generate -- --governance --judge a --per-code 6   # candidates; --kinds error,error,... for more errors
npm run gold:label -- --judge a                                 # judge a labels every item twice -> model_labels/<model-a>-i<N>.jsonl
npm run gold:label -- --judge b                                 # judge b labels every item once -> model_labels/<model-b>-i<N>.jsonl
npm run gold:consensus -- --a <model-a>-i<N> --b <model-b>-i<N> # gold + inter-judge κ       -> model_labels/<a>--<b>.jsonl
npm run bench -- --models fast,strong --against model:<a>--<b>
```

`gold:label` resumes where it stopped. Judge b (Gemini) is paid per call, so it runs once by default: a full pass of 206 items twice cost about $0.80, and its two runs agreed on 202 items (κ 0.972). Re-label with judge b only when the guidelines change, batching several fixes into one pass; `--runs 2` asks for a second run. After a guideline change, `--ids <file> --carry <old set>` re-labels only the listed items and copies the rest from the old set, marked "carried from" in their notes: list the items the change could move (the old consensus's uncertain items, the ones judge a now labels differently, and a random sample of the rest as a check). Where a judge's two runs disagree, or the two judges disagree, the item becomes "uncertain", so the evaluator should abstain on it. `gold:consensus` checks inter-judge κ against the bar §25 set for two human annotators (≥ 0.75 evaluation, ≥ 0.60 diagnosis). Results are model-judged: reports say so. The plan's anchor against real Spanish is native-corrected learner corpora, not a person.

The reference set is the two-judge consensus `gpt-6-luna-i5--gemini-3.8-flash-i5` (instructions v5): 107 correct, 78 incorrect, 1 N/A, 20 uncertain; κ evaluation 0.863 (bar 0.75), κ diagnosis 0.934 (bar 0.60). Judge b re-labelled 71 items under v5 and carried 135 from v4; a random check sample of 20 carried items came back unchanged. The v5 rules were written after looking at v4 disagreements on all items, so the `check` half is not a clean held-out measure of them. Under v4 the consensus was below the bar (κ evaluation 0.709). The earlier human labels and adjudications were discarded on 2026-10-20; they stay in git history only.

1. **Generate candidates**: `gold:generate` writes realistic B1 responses, including hard look-alikes and ambiguous cases. Their intended labels go to `data/gold/generator_intent.jsonl`, which the judges never see. `--against intent` in bench screens models against those intents; the report says plainly that this is not a gold measurement.
2. **Label and combine** as above. `npm run gold:model-compare -- --model <set> --annotator model:<other>` lists every disagreement between two sets, with both judges' rationales; `--subset tune|check` splits the items so guidelines are tuned on one half and measured on the other.
3. **Benchmark**: `npm run bench -- --models fast,strong,cloudflare:@cf/... --against model:<consensus>`. This runs the `dev` split and reports the §25 gates, false accusations, latency and tokens in `reports/bench/<run>/report.md`. Iterate prompts on `dev` only; run `--split heldout` to report.
   - Reasoning models take an effort suffix, e.g. `cloudflare:@cf/openai/gpt-oss-120b#low` (sent as `reasoning_effort`). `CLOUDFLARE_CANDIDATES` in `src/lib/ai/config.ts` lists the models checked to work, with the suffix each needs. For the tiers, put the effort in `GLOTTY_EFFORT_FAST`/`GLOTTY_EFFORT_STRONG` instead: `#` starts a comment in `.env` files and environment settings, which drops the suffix. If a reasoning model spends the whole token budget thinking, the gateway fails with a message saying so; it never reads the answer out of the reasoning text.

The gold set lives only in `data/gold`, versioned in git; nothing in the app reads it. The annotation pages (`/annotate`, `/adjudicate`), `gold:push`/`gold:pull` and the D1 gold tables were removed on 2026-10-20 (migration `0003_drop_gold`); they stay in git history.

## Tests

```bash
npm test            # unit tests (gateway is tested against a mocked fetch)
npm run typecheck
```
