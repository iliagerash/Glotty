/**
 * Drafts candidate gold items with an LLM, to bootstrap annotation (§24).
 *
 * Generated items are *candidates*, not gold. Only human annotation makes
 * them gold. The generator's intended label is stored separately in
 * generator_intent.jsonl and is never shown to annotators.
 *
 *   npm run gold:generate -- --per-code 6 [--model strong] [--codes PI.01,PP.02]
 */
import "dotenv/config";
import { parseArgs } from "util";
import { z } from "zod";
import { completeStructured } from "@/lib/ai/gateway";
import { resolveModel } from "@/lib/ai/config";
import { loadTaxonomy, type TaxonomyCode } from "@/lib/taxonomy";
import { addItems, appendGeneratorIntent, itemIdFor, type GoldItem } from "@/lib/gold/store";

const KINDS = {
  error: "contains this misconception (evaluation incorrect, code = this code)",
  hard_negative:
    "looks like this misconception on the surface but is correct Spanish under its most plausible reading (evaluation correct, code null); model these on the code's negative examples",
  ambiguous:
    "correct under one plausible intent and wrong under another, with nothing in the prompt to decide (evaluation uncertain, code null)",
  other_error:
    "uses the target forms correctly but has an unrelated mistake such as gender agreement or a missing accent (evaluation correct, code null)",
} as const;

const Batch = z.object({
  items: z.array(
    z.object({
      prompt: z.string(),
      response: z.string(),
      kind: z.enum(Object.keys(KINDS) as [keyof typeof KINDS, ...(keyof typeof KINDS)[]]),
      intended_evaluation: z.enum(["correct", "incorrect", "uncertain"]),
      intended_code: z.string().nullable(),
    }),
  ),
});

function instructions(code: TaxonomyCode, perCode: number): string {
  return `You write test data for a Spanish evaluator. Produce ${perCode} items for this misconception:

${code.code}: ${code.name}
Definition: ${code.definition}
Examples of it: ${code.positive_examples.join(" | ")}
Look-alikes that are NOT it: ${code.negative_examples.join(" | ")}

Each item is a tutor prompt in Spanish (a natural conversational question that invites a narrative or explanation) and a learner response.

Learner responses must read like real writing from an adult English speaker at B1 level: 1-3 sentences, everyday topics (work, travel, family, childhood, weekend plans), some missing accents, occasional anglicisms. Vary topics, verbs, length and sentence structure. Do not copy the examples above. Do not mark errors with asterisks.

Distribute the items across these kinds, at least one of each:
${Object.entries(KINDS)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}

Reply with JSON only: {"items": [{"prompt", "response", "kind", "intended_evaluation", "intended_code"}]}`;
}

async function main() {
  const { values } = parseArgs({
    options: {
      "per-code": { type: "string", default: "6" },
      model: { type: "string", default: "strong" },
      codes: { type: "string" },
    },
  });
  const perCode = Number(values["per-code"]);
  const model = resolveModel(values.model!);
  const wanted = values.codes?.split(",");
  const codes = loadTaxonomy().filter(
    (c) => c.code !== "UNKNOWN" && (!wanted || wanted.includes(c.code)),
  );

  let added = 0;
  for (const code of codes) {
    try {
      const { data } = await completeStructured({
        model: model.ref,
        schema: Batch,
        schemaName: "gold_candidates",
        messages: [{ role: "user", content: instructions(code, perCode) }],
        temperature: 0.9,
        maxTokens: 4000,
      });
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
          })),
      );
      added += fresh.length;
      console.log(`${code.code}: +${fresh.length} (${data.items.length - fresh.length} duplicates)`);
    } catch (err) {
      console.error(`${code.code}: FAILED ${(err as Error).message}`);
      process.exitCode = 1;
    }
  }
  console.log(`Added ${added} candidate items.`);
}

main();
