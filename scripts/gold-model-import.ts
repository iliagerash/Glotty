/**
 * Imports labels written by an external model (see gold:model-export) into
 * data/gold/model_labels/<name>.jsonl. These are "silver" labels: they are
 * kept apart from human annotations and never count as gold.
 *
 *   npm run gold:model-import -- --name chatgpt-<model> --file labels.jsonl [--allow-partial]
 *
 * Accepts JSONL or a JSON array, and tolerates a surrounding ``` fence.
 * Nothing is written if any line is invalid.
 */
import fs from "fs";
import { parseArgs } from "util";
import { z } from "zod";
import { readItems, writeModelLabels, modelLabelFile, type Annotation } from "@/lib/gold/store";
import { taxonomyCodes } from "@/lib/taxonomy";

const EVALUATION_ALIASES: Record<string, Annotation["evaluation"]> = {
  correct: "correct",
  incorrect: "incorrect",
  uncertain: "uncertain",
  ambiguous: "uncertain",
  not_applicable: "not_applicable",
  "not applicable": "not_applicable",
  "n/a": "not_applicable",
  na: "not_applicable",
};

const Row = z.object({
  item_id: z.string(),
  evaluation: z.string().transform((s, ctx) => {
    const e = EVALUATION_ALIASES[s.trim().toLowerCase()];
    if (!e) ctx.addIssue({ code: "custom", message: `unknown evaluation "${s}"` });
    return e;
  }),
  diagnosis_code: z.string().nullish(),
  confidence: z.coerce.number().int().min(1).max(3),
  notes: z.string().nullish(),
});

function parse(text: string): unknown[] {
  const body = text.replace(/^\s*```[a-z]*\s*\n/i, "").replace(/\n\s*```\s*$/, "").trim();
  if (body.startsWith("[")) return JSON.parse(body);
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l, i) => {
      try {
        return JSON.parse(l);
      } catch {
        throw new Error(`Line ${i + 1} is not JSON: ${l.slice(0, 80)}`);
      }
    });
}

function main() {
  const { values } = parseArgs({
    options: {
      name: { type: "string" },
      file: { type: "string" },
      "allow-partial": { type: "boolean", default: false },
    },
  });
  if (!values.name || !values.file) {
    console.error("Usage: npm run gold:model-import -- --name chatgpt-<model> --file labels.jsonl [--allow-partial]");
    process.exit(1);
  }
  const target = modelLabelFile(values.name);
  const items = new Set(readItems().map((i) => i.id));
  const codes = taxonomyCodes();
  const errors: string[] = [];
  const labels = new Map<string, Annotation>();
  const now = new Date().toISOString();

  parse(fs.readFileSync(values.file, "utf-8")).forEach((raw, i) => {
    const where = `row ${i + 1}`;
    const r = Row.safeParse(raw);
    if (!r.success) return errors.push(`${where}: ${z.prettifyError(r.error).replace(/\n/g, " ")}`);
    const { item_id, evaluation, confidence } = r.data;
    const code = r.data.diagnosis_code?.trim() || null;
    if (!items.has(item_id)) return errors.push(`${where}: unknown item_id "${item_id}"`);
    if (labels.has(item_id)) return errors.push(`${where}: duplicate label for ${item_id}`);
    if (evaluation === "incorrect" && (!code || !codes.has(code))) {
      return errors.push(`${where}: ${item_id} is incorrect but has code ${JSON.stringify(code)}`);
    }
    labels.set(item_id, {
      item_id,
      annotator: values.name!,
      evaluation,
      diagnosis_code: evaluation === "incorrect" ? code : null,
      confidence: confidence as 1 | 2 | 3,
      notes: r.data.notes?.trim() || undefined,
      annotated_at: now,
    });
  });

  const missing = [...items].filter((id) => !labels.has(id));
  if (missing.length && !values["allow-partial"]) {
    errors.push(`${missing.length} of ${items.size} items have no label, e.g. ${missing.slice(0, 5).join(", ")} (use --allow-partial to import anyway)`);
  }
  if (errors.length) {
    console.error(`Not imported. ${errors.length} problem(s):\n  ${errors.slice(0, 30).join("\n  ")}`);
    process.exit(1);
  }

  writeModelLabels(values.name, [...labels.values()]);
  const counts = [...labels.values()].reduce<Record<string, number>>((acc, l) => {
    acc[l.evaluation] = (acc[l.evaluation] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`Imported ${labels.size} labels to ${target.replace(process.cwd() + "/", "")}: ${JSON.stringify(counts)}`);
  if (missing.length) console.log(`${missing.length} items unlabelled.`);
}

main();
