/**
 * Asks a governance judge (a, OpenAI, by default) for a critical second
 * opinion on the diagnostic taxonomy (data/taxonomy/mvp_taxonomy.json),
 * before more training data is coded against it.
 *
 *   npm run taxonomy:review [-- --judge a|b]
 *
 * One call. The judge gets the whole taxonomy plus the evidence collected so
 * far: how often each code was used on real learner errors (training codes),
 * where the two judges split on the code, where the generator's intended
 * code differed from the judges', the errors no code fitted (UNKNOWN), and
 * real examples per code. Writes data/taxonomy/review-<model>.json and .md.
 * Nothing in the taxonomy is changed.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { parseArgs } from "util";
import { z } from "zod";
import { governanceConfig, governedJson, type JudgeId } from "@/lib/governance";
import { readGeneratorIntent, readItems, readModelLabelsIfAny } from "@/lib/gold/store";
import { waiting } from "@/lib/progress";
import { loadTaxonomy } from "@/lib/taxonomy";
import type { PoolItem } from "./train-export";

const TRAIN = path.join(process.cwd(), "data", "train");
const jsonl = <T>(file: string): T[] =>
  fs.existsSync(file) ? fs.readFileSync(file, "utf-8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];

const VERDICTS = ["keep", "rewrite", "merge", "split", "drop"] as const;
const Review = z.object({
  overall: z.string(),
  codes: z.array(
    z.object({
      code: z.string(),
      verdict: z.enum(VERDICTS),
      clarity: z.number().int().min(1).max(5),
      documented_misconception: z.enum(["yes", "partly", "no"]),
      diagnosable_from_one_response: z.boolean(),
      overlaps: z.array(z.string()),
      problems: z.string(),
      merge_with: z.string().nullable(),
      proposed_name: z.string().nullable(),
      proposed_definition: z.string().nullable(),
    }),
  ),
  missing: z.array(z.object({ name: z.string(), definition: z.string(), example: z.string(), why: z.string() })),
});
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["overall", "codes", "missing"],
  properties: {
    overall: { type: "string" },
    codes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["code", "verdict", "clarity", "documented_misconception", "diagnosable_from_one_response", "overlaps", "problems", "merge_with", "proposed_name", "proposed_definition"],
        properties: {
          code: { type: "string" },
          verdict: { type: "string", enum: [...VERDICTS] },
          clarity: { type: "integer", enum: [1, 2, 3, 4, 5] },
          documented_misconception: { type: "string", enum: ["yes", "partly", "no"] },
          diagnosable_from_one_response: { type: "boolean" },
          overlaps: { type: "array", items: { type: "string" } },
          problems: { type: "string" },
          merge_with: { type: ["string", "null"] },
          proposed_name: { type: ["string", "null"] },
          proposed_definition: { type: ["string", "null"] },
        },
      },
    },
    missing: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "definition", "example", "why"],
        properties: { name: { type: "string" }, definition: { type: "string" }, example: { type: "string" }, why: { type: "string" } },
      },
    },
  },
};

const INSTRUCTIONS = `You are an expert in second language acquisition of Spanish, especially preterite/imperfect aspect and por/para, and in designing diagnostic error taxonomies. Give a critical, independent review of the taxonomy below. Do not defer to it: it was drafted quickly and has not been validated.

How it is used: an LLM evaluator reads one short written response from an adult English-speaking B1 learner, decides whether the preterite/imperfect and por/para choices are correct, and for an error picks one code that explains WHY the learner chose wrong. The code drives the learner model and which targeted practice (intervention_family) the learner gets next. So a good code (a) names a misconception documented in the SLA literature or clearly observable in learner writing, (b) can be told apart from its neighbours using only the one response and its prompt, (c) leads to a different intervention than its neighbours. A code that can only be seen across several responses (for example "erratic switching") cannot be assigned from one response.

The evidence section shows how the codes behave in practice: code frequencies on real, instructor-corrected learner errors; where two independent judge models agreed a response was wrong but chose different codes; where the item generator's intended code differed from the judges'; and real errors no code fitted (UNKNOWN). Use it.

For every code, including UNKNOWN, give: verdict (keep, rewrite, merge, split or drop), clarity 1-5, whether it is a documented misconception, whether it is diagnosable from one response, which codes it overlaps with, the problems in plain words, and for rewrite/merge/split a proposed name and definition (merge_with names the code it should merge into). Then list misconceptions the taxonomy is missing that the evidence or the literature suggests, with an example. In "overall", say whether the taxonomy is fit for training an evaluator, and the three changes that matter most.`;

async function main() {
  const { values } = parseArgs({ options: { judge: { type: "string", default: "a" } } });
  if (values.judge !== "a" && values.judge !== "b") throw new Error("--judge must be a or b");
  const config = governanceConfig(values.judge as JudgeId);
  const taxonomy = loadTaxonomy();

  // Evidence 1: codes on real instructor-corrected errors (training pool), dropping false aspect swaps.
  const pool = new Map(jsonl<PoolItem>(path.join(TRAIN, "cowsl2h-pool.jsonl")).map((p) => [p.id, p]));
  const realError = (p?: PoolItem) => p?.kind === "error";
  const coded = jsonl<{ id: string; diagnosis_code: string; analysis: string }>(path.join(TRAIN, "codes.jsonl")).filter((c) => realError(pool.get(c.id)));
  const counts = Object.fromEntries(taxonomy.map((t) => [t.code, coded.filter((c) => c.diagnosis_code === t.code).length]));
  const show = (c: (typeof coded)[number]) => {
    const p = pool.get(c.id)!;
    return { response: p.response, instructor_changed: p.findings.map((f) => `${f.from} -> ${f.to}`), analysis: c.analysis };
  };
  const examples = Object.fromEntries(taxonomy.map((t) => [t.code, coded.filter((c) => c.diagnosis_code === t.code).slice(0, 3).map(show)]));
  const unknown = coded.filter((c) => c.diagnosis_code === "UNKNOWN").slice(0, 25).map(show);

  // Evidence 2: both judges said incorrect but chose different codes.
  const items = new Map(readItems().map((i) => [i.id, i]));
  const a = readModelLabelsIfAny("gpt-6-luna-i5");
  const b = readModelLabelsIfAny("gemini-3.8-flash-i5");
  const judgeSplits = [...a.values()]
    .filter((l) => l.evaluation === "incorrect" && b.get(l.item_id)?.evaluation === "incorrect" && b.get(l.item_id)?.diagnosis_code !== l.diagnosis_code)
    .map((l) => ({ response: items.get(l.item_id)?.response, judge_1: l.diagnosis_code, judge_2: b.get(l.item_id)!.diagnosis_code }));

  // Evidence 3: generator's intended code vs a judge code on the same error.
  const intent = readGeneratorIntent();
  const generatorSplits = [...intent.values()]
    .filter((g) => g.evaluation === "incorrect" && a.get(g.item_id)?.evaluation === "incorrect" && a.get(g.item_id)?.diagnosis_code !== g.diagnosis_code)
    .map((g) => ({ response: items.get(g.item_id)?.response, intended: g.diagnosis_code, judged: a.get(g.item_id)!.diagnosis_code }));

  const evidence = {
    code_counts_on_real_errors: { total: coded.length, by_code: counts },
    real_examples_per_code: examples,
    unknown_real_errors: unknown,
    judges_split_on_code: judgeSplits,
    generator_vs_judge_code: generatorSplits,
  };
  console.log(
    `Reviewing ${taxonomy.length} codes with ${config.ref}: ${coded.length} coded real errors, ${judgeSplits.length} judge code splits, ${generatorSplits.length} generator/judge code splits, ${unknown.length} UNKNOWN examples.`,
  );
  const { data } = await waiting(
    config.ref,
    governedJson({
      config,
      name: "taxonomy_review",
      jsonSchema: SCHEMA,
      schema: Review,
      instructions: INSTRUCTIONS,
      input: JSON.stringify({ taxonomy, evidence }),
    }),
  );

  const name = config.model.toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
  const base = path.join(process.cwd(), "data", "taxonomy", `review-${name}`);
  fs.writeFileSync(`${base}.json`, JSON.stringify({ reviewer: config.ref, reviewed_at: new Date().toISOString(), evidence_summary: { real_errors: coded.length, by_code: counts, judge_splits: judgeSplits.length, generator_splits: generatorSplits.length }, ...data }, null, 2) + "\n");
  const md = [
    `# Taxonomy review by ${config.ref}`,
    "",
    `Reviewed ${new Date().toISOString().slice(0, 10)} with \`npm run taxonomy:review\`. Evidence: ${coded.length} real instructor-corrected errors, ${judgeSplits.length} judge code splits, ${generatorSplits.length} generator/judge code splits.`,
    "",
    "## Overall",
    "",
    data.overall,
    "",
    "## Codes",
    "",
    "| Code | Verdict | Clarity | Documented | One response? | Overlaps | Real errors |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...data.codes.map((c) => `| ${c.code} | ${c.verdict}${c.merge_with ? ` → ${c.merge_with}` : ""} | ${c.clarity} | ${c.documented_misconception} | ${c.diagnosable_from_one_response ? "yes" : "no"} | ${c.overlaps.join(", ")} | ${counts[c.code] ?? "-"} |`),
    "",
    ...data.codes.flatMap((c) => [
      `### ${c.code}: ${c.verdict}`,
      "",
      c.problems,
      ...(c.proposed_name || c.proposed_definition ? ["", `**Proposed:** ${c.proposed_name ?? ""}${c.proposed_definition ? ` — ${c.proposed_definition}` : ""}`] : []),
      "",
    ]),
    "## Missing misconceptions",
    "",
    ...data.missing.flatMap((m) => [`### ${m.name}`, "", m.definition, "", `Example: ${m.example}`, "", m.why, ""]),
  ].join("\n");
  fs.writeFileSync(`${base}.md`, md);
  console.log(`Wrote ${path.relative(process.cwd(), base)}.md and .json`);
}

main();
