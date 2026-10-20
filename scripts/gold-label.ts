/**
 * Labels the gold candidates with one governance judge (src/lib/governance):
 * judge a (OpenAI) by default, judge b (Gemini) with --judge b.
 *
 *   npm run gold:label -- [--judge a|b] [--name <set>] [--runs 2] [--concurrency 4] [--limit 20]
 *
 * Each run labels every item independently and is saved as
 * data/gold/model_labels/<set>.r<N>.jsonl, one line per item as it completes,
 * so an interrupted run resumes where it stopped. The runs are then combined
 * into <set>.jsonl: where they agree, that label; where they split, the item
 * becomes "uncertain" (see combineRuns). The default set name records the
 * model and the instructions version, e.g. gpt-6-luna-i4.
 *
 * Label with both judges, then combine them with gold:consensus; bench
 * against the consensus set.
 */
import "dotenv/config";
import { parseArgs } from "util";
import { z } from "zod";
import { governanceConfig, governedJson, GovernanceError, type GovernanceConfig, type JudgeId } from "@/lib/governance";
import { INSTRUCTIONS_VERSION, itemInstructions } from "@/lib/gold/instructions";
import { cohensKappa, combineRuns } from "@/lib/gold/metrics";
import {
  appendModelLabels,
  readItems,
  readModelLabelsIfAny,
  writeModelLabels,
  type Annotation,
  type GoldItem,
} from "@/lib/gold/store";
import { taxonomyCodes } from "@/lib/taxonomy";

const EVALUATIONS = ["correct", "incorrect", "uncertain", "not_applicable"] as const;

const Label = z.object({
  evaluation: z.enum(EVALUATIONS),
  diagnosis_code: z.string().nullable(),
  confidence: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  notes: z.string(),
  rationale: z.string(),
});

const LABEL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["evaluation", "diagnosis_code", "confidence", "notes", "rationale"],
  properties: {
    evaluation: { type: "string", enum: [...EVALUATIONS] },
    diagnosis_code: { type: ["string", "null"] },
    confidence: { type: "integer", enum: [1, 2, 3] },
    notes: { type: "string" },
    rationale: { type: "string" },
  },
};

async function labelOne(
  config: GovernanceConfig,
  item: GoldItem,
  name: string,
  instructions: string,
  codes: Set<string>,
): Promise<Annotation> {
  const { data } = await governedJson({
    config,
    name: "gold_label",
    jsonSchema: LABEL_SCHEMA,
    schema: Label,
    instructions,
    input: JSON.stringify({ prompt: item.prompt, response: item.response }),
  });
  if (data.evaluation === "incorrect" && (!data.diagnosis_code || !codes.has(data.diagnosis_code))) {
    throw new Error(`incorrect with unknown code ${JSON.stringify(data.diagnosis_code)}`);
  }
  return {
    item_id: item.id,
    annotator: name,
    evaluation: data.evaluation,
    diagnosis_code: data.evaluation === "incorrect" ? data.diagnosis_code : null,
    confidence: data.confidence,
    notes: data.notes.trim() || undefined,
    rationale: data.rationale.trim() || undefined,
    annotated_at: new Date().toISOString(),
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      judge: { type: "string", default: "a" },
      name: { type: "string" },
      runs: { type: "string", default: "2" },
      concurrency: { type: "string", default: "4" },
      limit: { type: "string" },
    },
  });
  if (values.judge !== "a" && values.judge !== "b") throw new GovernanceError("--judge must be a or b");
  const config = governanceConfig(values.judge as JudgeId);
  const name = values.name ?? `${config.model.toLowerCase().replace(/[^a-z0-9.-]+/g, "-")}-i${INSTRUCTIONS_VERSION}`;
  const runs = Number(values.runs);
  const items = readItems().slice(0, values.limit ? Number(values.limit) : undefined);
  const instructions = itemInstructions();
  const codes = taxonomyCodes();
  console.log(`Labelling ${items.length} items with ${config.ref}, ${runs} run(s), into model_labels/${name}.*`);

  let failed = 0;
  for (let r = 1; r <= runs; r++) {
    const runName = `${name}.r${r}`;
    const done = readModelLabelsIfAny(runName);
    const todo = items.filter((i) => !done.has(i.id));
    let next = 0;
    let finished = 0;
    async function worker() {
      while (next < todo.length) {
        const item = todo[next++];
        try {
          appendModelLabels(runName, [await labelOne(config, item, runName, instructions, codes)]);
        } catch (err) {
          failed++;
          console.error(`  run ${r} ${item.id}: ${(err as Error).message.slice(0, 300)}`);
        }
        finished++;
        if (finished % 10 === 0 || finished === todo.length) process.stdout.write(`  run ${r}: ${finished}/${todo.length}\r`);
      }
    }
    await Promise.all(Array.from({ length: Math.min(Number(values.concurrency), todo.length) }, worker));
    process.stdout.write("\n");
  }

  // Combine the runs. Only items every run labelled are combined.
  const byRun = Array.from({ length: runs }, (_, i) => readModelLabelsIfAny(`${name}.r${i + 1}`));
  const combined: Annotation[] = [];
  let splits = 0;
  for (const item of items) {
    const labels = byRun.map((m) => m.get(item.id));
    if (labels.some((l) => !l)) continue;
    const runLabels = labels as Annotation[];
    const { label, split } = combineRuns(runLabels);
    if (split) splits++;
    const show = (l: Annotation) => `${l.evaluation}${l.diagnosis_code ? ` ${l.diagnosis_code}` : ""}`;
    combined.push({
      item_id: item.id,
      annotator: name,
      ...label,
      confidence: split ? 1 : (Math.min(...runLabels.map((l) => l.confidence)) as 1 | 2 | 3),
      notes: split ? `runs split: ${runLabels.map(show).join(" | ")}` : runLabels[0].notes,
      rationale: runLabels.map((l, i) => (runs > 1 ? `[r${i + 1}] ${l.rationale ?? ""}` : (l.rationale ?? ""))).join(" "),
      annotated_at: new Date().toISOString(),
    });
  }
  writeModelLabels(name, combined);

  const counts = combined.reduce<Record<string, number>>((acc, l) => ({ ...acc, [l.evaluation]: (acc[l.evaluation] ?? 0) + 1 }), {});
  console.log(`Combined ${combined.length}/${items.length} items into model_labels/${name}.jsonl: ${JSON.stringify(counts)}`);
  if (runs > 1) {
    const both = items.filter((i) => byRun.every((m) => m.has(i.id)));
    const k = cohensKappa(both.map((i) => byRun[0].get(i.id)!.evaluation), both.map((i) => byRun[1].get(i.id)!.evaluation));
    console.log(`Runs split on ${splits} items (now uncertain). κ evaluation, run 1 vs run 2: ${k === null ? "n/a" : k.toFixed(3)}`);
  }
  if (failed) {
    console.error(`${failed} calls failed; re-run the same command to retry them.`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof GovernanceError ? `${err.name}: ${err.message}` : err);
  process.exit(1);
});
