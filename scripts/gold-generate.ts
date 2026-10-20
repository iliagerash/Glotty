/**
 * Drafts candidate gold items with an LLM, to bootstrap annotation (§24).
 *
 * Generated items are *candidates*, not gold. Only human annotation makes
 * them gold. The generator's intended label is stored separately in
 * generator_intent.jsonl and is never shown to annotators.
 *
 *   npm run gold:generate -- --per-code 6 [--model strong | --governance [--judge a|b]] [--codes PI.01,PP.02]
 *                           [--kinds error,error,hard_negative]
 *
 * --governance writes the candidates with a governance judge
 * (src/lib/governance; judge a by default) instead of a Workers AI model.
 * --kinds replaces the default mix of item kinds, cycled per code, e.g. to
 * add error items.
 */
import "dotenv/config";
import { parseArgs } from "util";
import { z } from "zod";
import { completeStructured } from "@/lib/ai/gateway";
import { governanceConfig, governedJson, type JudgeId } from "@/lib/governance";
import { resolveModel } from "@/lib/ai/config";
import { loadTaxonomy, type TaxonomyCode } from "@/lib/taxonomy";
import { addItems, appendGeneratorIntent, itemIdFor, type GoldItem } from "@/lib/gold/store";

const KINDS = {
  error:
    "contains exactly one clear instance of this misconception, which any Spanish teacher would mark wrong (evaluation incorrect, code = this code)",
  hard_negative:
    "uses the same structure or trigger words as this misconception but is correct Spanish under its most plausible reading (evaluation correct, code null); model these on the look-alikes",
  ambiguous:
    "correct under one plausible intent and wrong under another, with nothing in the prompt to decide; both readings must be natural (evaluation uncertain, code null)",
  other_error:
    "uses the target forms correctly but contains one unrelated, concrete mistake such as a gender agreement error, a missing accent or an anglicism (evaluation correct, code null)",
} as const;
type Kind = keyof typeof KINDS;

const TOPICS = [
  "childhood", "a job", "a trip abroad", "a holiday at home", "a family celebration", "school or university",
  "moving house", "a medical visit", "a sports match", "cooking a meal", "a concert or film", "a flatmate or neighbour",
  "a car or bike problem", "shopping", "a first date", "a pet", "learning a skill", "a lost item",
];

const DEFAULT_KINDS: Kind[] = ["error", "hard_negative", "ambiguous", "other_error", "error", "hard_negative"];

/** Kinds for one batch, cycling through `order` (by default errors and look-alikes first, at least one of each). */
function kindPlan(perCode: number, order: Kind[] = DEFAULT_KINDS): Kind[] {
  return Array.from({ length: perCode }, (_, i) => order[i % order.length]);
}

/** Batch as a strict JSON schema, for the governance model's structured output. */
const BATCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "prompt", "response", "target_span", "rationale", "intended_evaluation", "intended_code"],
        properties: {
          kind: { type: "string", enum: Object.keys(KINDS) },
          prompt: { type: "string" },
          response: { type: "string" },
          target_span: { type: "string" },
          rationale: { type: "string" },
          intended_evaluation: { type: "string", enum: ["correct", "incorrect", "uncertain"] },
          intended_code: { type: ["string", "null"] },
        },
      },
    },
  },
};

const Batch = z.object({
  items: z.array(
    z.object({
      kind: z.enum(Object.keys(KINDS) as [Kind, ...Kind[]]),
      prompt: z.string(),
      response: z.string(),
      target_span: z.string(),
      rationale: z.string(),
      intended_evaluation: z.enum(["correct", "incorrect", "uncertain"]),
      intended_code: z.string().nullable(),
    }),
  ),
});

function instructions(code: TaxonomyCode, perCode: number, topics: string[], kinds?: Kind[]): string {
  const plan = kindPlan(perCode, kinds);
  return `You write test data for an evaluator of Spanish written by English-speaking learners. Produce exactly ${perCode} items for this misconception:

${code.code}: ${code.name}
Definition: ${code.definition}
Examples of it: ${code.positive_examples.join(" | ")}
Look-alikes that are NOT it (these forms are correct): ${code.negative_examples.join(" | ")}

Item kinds:
${Object.entries(KINDS)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}

Produce the items in this order of kinds: ${plan.join(", ")}.
Use these topics, one per item, in order: ${topics.join(", ")}.

Rules:
- The prompt is a natural conversational question from a tutor, in Spanish, that makes the learner produce the structure this code is about (for example a past narrative for past-tense codes, a reason or purpose for por/para codes). It must fit the response.
- The response reads like real writing from an adult B1 learner: 1-3 sentences, plausible content, missing accents now and then. It is only what the learner wrote: never describe or point out a mistake inside it, and never mark errors with asterisks.
- Any form listed as a look-alike is correct Spanish. Never label it as this misconception.
- Do not copy or lightly edit the examples above.
- target_span is the exact words of the response that the label depends on.
- rationale says in one sentence why the label holds. For an error item, target_span is the wrong form this misconception produces (like the forms in "Examples of it"), and the rationale must name the form a native speaker would use instead. For an ambiguous item, give both readings.
- Before you finish, reread each item as a native-speaking Spanish teacher. If an error item is actually acceptable, or a correct item actually contains this misconception, rewrite it.

Reply with JSON only: {"items": [{"kind", "prompt", "response", "target_span", "rationale", "intended_evaluation", "intended_code"}]}`;
}

async function main() {
  const { values } = parseArgs({
    options: {
      "per-code": { type: "string", default: "6" },
      model: { type: "string", default: "strong" },
      governance: { type: "boolean", default: false },
      judge: { type: "string", default: "a" },
      codes: { type: "string" },
      kinds: { type: "string" },
    },
  });
  const perCode = Number(values["per-code"]);
  const kinds = values.kinds?.split(",").map((k) => k.trim()) as Kind[] | undefined;
  if (kinds?.some((k) => !(k in KINDS))) {
    console.error(`--kinds takes a comma list of: ${Object.keys(KINDS).join(", ")}`);
    process.exit(1);
  }
  // The generator's ref, recorded on every item and intended label.
  if (values.judge !== "a" && values.judge !== "b") {
    console.error("--judge must be a or b");
    process.exit(1);
  }
  const judge = values.governance ? governanceConfig(values.judge as JudgeId) : null;
  const model = judge ? { ref: judge.ref } : resolveModel(values.model!);
  const wanted = values.codes?.split(",");
  const codes = loadTaxonomy().filter(
    (c) => c.code !== "UNKNOWN" && (!wanted || wanted.includes(c.code)),
  );

  let added = 0;
  for (const [n, code] of codes.entries()) {
    // Rotate topics so codes do not all write about the same weekend at the beach.
    const topics = Array.from({ length: perCode }, (_, i) => TOPICS[(n * perCode + i) % TOPICS.length]);
    try {
      const prompt = instructions(code, perCode, topics, kinds);
      const { data: raw } = judge
        ? await governedJson({
            config: judge,
            name: "gold_candidates",
            jsonSchema: BATCH_SCHEMA,
            schema: Batch,
            instructions: "Follow the task below exactly and return the items through the given JSON schema.",
            input: prompt,
          })
        : await completeStructured({
            model: model.ref,
            schema: Batch,
            schemaName: "gold_candidates",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.9,
            maxTokens: 8000,
          });
      // The kind fixes the label; an item whose label disagrees with its own kind is dropped.
      const expected: Record<Kind, [string, string | null]> = {
        error: ["incorrect", code.code],
        hard_negative: ["correct", null],
        ambiguous: ["uncertain", null],
        other_error: ["correct", null],
      };
      const data = {
        items: raw.items.filter(
          (it) => it.intended_evaluation === expected[it.kind][0] && it.intended_code === expected[it.kind][1],
        ),
      };
      const inconsistent = raw.items.length - data.items.length;
      const now = new Date().toISOString();
      const items: GoldItem[] = data.items.map((it) => ({
        id: itemIdFor("syn", it.response),
        prompt: it.prompt,
        response: it.response,
        source: "llm_synthetic",
        origin: `${model.ref} for ${code.code}`,
        created_at: now,
      }));
      const fresh = addItems(items);
      const freshIds = new Set(fresh.map((i) => i.id));
      appendGeneratorIntent(
        data.items
          .map((it, i) => ({ it, id: items[i].id }))
          .filter(({ id }) => freshIds.has(id))
          .map(({ it, id }) => ({
            item_id: id,
            evaluation: it.intended_evaluation,
            diagnosis_code: it.intended_code,
            kind: it.kind,
            generator: model.ref,
            rationale: `${it.target_span}: ${it.rationale}`,
          })),
      );
      added += fresh.length;
      console.log(
        `${code.code}: +${fresh.length} (${data.items.length - fresh.length} duplicates, ${inconsistent} inconsistent labels dropped)`,
      );
    } catch (err) {
      console.error(`${code.code}: FAILED ${(err as Error).message}`);
      process.exitCode = 1;
    }
  }
  console.log(`Added ${added} candidate items.`);
}

main();
