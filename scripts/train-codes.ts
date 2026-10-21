/**
 * Gives each instructor-corrected error in the training pool a taxonomy code,
 * with a governance judge (a, OpenAI, by default; --judge b for Gemini). The
 * instructor's correction decides that the item is wrong; the judge only says
 * why, from the taxonomy, and writes the one-sentence analysis the fine-tuned
 * evaluator learns to produce.
 *
 *   npm run train:codes [-- --judge a|b] [--concurrency 4]
 *   npm run train:codes -- --check 50 [--judge a]
 *
 * Reads data/train/cowsl2h-pool.jsonl, appends to data/train/codes.jsonl one
 * line per item as it completes, so an interrupted run resumes; each line
 * records which judge coded it.
 *
 * --check N re-codes a fixed sample of N items that the other judge coded,
 * into data/train/codes-check.jsonl (also resumable), and reports how often
 * the two judges pick the same code. codes.jsonl is not changed.
 */
import "dotenv/config";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { parseArgs } from "util";
import { z } from "zod";
import { renderTaxonomy } from "@/lib/evaluator";
import { governanceConfig, governedJson, type JudgeId } from "@/lib/governance";
import { progress } from "@/lib/progress";
import { taxonomyCodes } from "@/lib/taxonomy";
import type { PoolItem } from "./train-export";

const POOL = path.join(process.cwd(), "data", "train", "cowsl2h-pool.jsonl");
const OUT = path.join(process.cwd(), "data", "train", "codes.jsonl");
const CHECK = path.join(process.cwd(), "data", "train", "codes-check.jsonl");

type Coded = { id: string; diagnosis_code: string; coder: string };
const readCoded = (file: string): Coded[] =>
  fs.existsSync(file) ? fs.readFileSync(file, "utf-8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["diagnosis_code", "error_span", "correction", "analysis"],
  properties: {
    diagnosis_code: { type: "string" },
    error_span: { type: "string" },
    correction: { type: "string" },
    analysis: { type: "string" },
  },
};
const Result = z.object({ diagnosis_code: z.string(), error_span: z.string(), correction: z.string(), analysis: z.string() });

const INSTRUCTIONS = `You are an expert Spanish teacher and applied linguist. You will receive a sentence pair written by an English-speaking learner of Spanish, the task prompt, and the change a Spanish instructor made to a preterite/imperfect verb or to por/para. The instructor's change is settled: the learner's form is wrong. Your job is to say why, using the taxonomy below.

Return:
- diagnosis_code: the one code from the taxonomy that best explains why the learner chose the wrong form; UNKNOWN if none fits. Read each code's "Is NOT this code" examples before choosing.
- error_span: the learner's wrong word(s), copied exactly from the response.
- correction: the instructor's form(s).
- analysis: 1-2 sentences in English, as a teacher would explain it: the target form, the meaning the learner intended, and why that meaning needs the corrected form. Do not mention the instructor.

## Diagnostic taxonomy

${renderTaxonomy()}`;

async function main() {
  const { values } = parseArgs({
    options: { judge: { type: "string", default: "a" }, concurrency: { type: "string", default: "4" }, check: { type: "string" } },
  });
  if (values.judge !== "a" && values.judge !== "b") throw new Error("--judge must be a or b");
  const config = governanceConfig(values.judge as JudgeId);
  const codes = new Set(taxonomyCodes());
  const pool = fs.readFileSync(POOL, "utf-8").trim().split("\n").map((l) => JSON.parse(l) as PoolItem);
  const out = values.check ? CHECK : OUT;
  const done = new Set(readCoded(out).map((c) => c.id));
  const coded = readCoded(OUT);
  // --check: a fixed sample (by hash) of items the other judge coded.
  const sample = values.check
    ? new Set(
        coded
          .filter((c) => c.coder !== config.ref)
          .sort((a, b) => hash(a.id).localeCompare(hash(b.id)))
          .slice(0, Number(values.check))
          .map((c) => c.id),
      )
    : null;
  const todo = pool.filter((p) => p.kind === "error" && !done.has(p.id) && (!sample || sample.has(p.id)));
  console.log(`${sample ? "Re-coding" : "Coding"} ${todo.length} errors with ${config.ref} (${done.size} already done) into ${path.relative(process.cwd(), out)}.`);

  let next = 0;
  let failed = 0;
  const bar = progress(todo.length, "coded");
  async function worker() {
    while (next < todo.length) {
      const item = todo[next++];
      try {
        const { data } = await governedJson({
          config,
          name: "train_code",
          jsonSchema: SCHEMA,
          schema: Result,
          instructions: INSTRUCTIONS,
          input: JSON.stringify({
            prompt: item.prompt,
            response: item.response,
            instructor_changed: item.findings.map((f) => `${f.from} -> ${f.to}`),
          }),
        });
        const code = codes.has(data.diagnosis_code) ? data.diagnosis_code : "UNKNOWN";
        fs.appendFileSync(out, JSON.stringify({ id: item.id, ...data, diagnosis_code: code, coder: config.ref }) + "\n");
        bar.tick();
      } catch (err) {
        failed++;
        // Start on a fresh line so the error doesn't overwrite the progress line.
        console.error(`\n  ${item.id}: ${(err as Error).message.slice(0, 200)}`);
        bar.tick(false);
      }
    }
  }
  await Promise.all(Array.from({ length: Number(values.concurrency) }, worker));
  bar.done();
  const total = readCoded(out).length;
  console.log(`${total} coded in ${path.relative(process.cwd(), out)}${failed ? `; ${failed} failed, re-run to retry` : ""}.`);
  if (failed) process.exitCode = 1;
  if (sample) report(coded, readCoded(CHECK).filter((c) => sample.has(c.id)));
}

/** Agreement between the original codes and the re-codes of the same items. */
function report(original: Coded[], recoded: Coded[]) {
  const before = new Map(original.map((c) => [c.id, c.diagnosis_code]));
  const pairs = recoded.map((c) => [before.get(c.id)!, c.diagnosis_code] as const);
  const n = pairs.length;
  if (!n) return;
  const same = pairs.filter(([a, b]) => a === b).length;
  const sameFamily = pairs.filter(([a, b]) => a.slice(0, 2) === b.slice(0, 2)).length;
  const pct = (k: number) => `${k}/${n} (${Math.round((100 * k) / n)}%)`;
  console.log(`Same code: ${pct(same)}. Same family (PI/PP/UNKNOWN): ${pct(sameFamily)}.`);
  const diffs = new Map<string, number>();
  for (const [a, b] of pairs) if (a !== b) diffs.set(`${a} -> ${b}`, (diffs.get(`${a} -> ${b}`) ?? 0) + 1);
  const top = [...diffs].sort((x, y) => y[1] - x[1]).slice(0, 8);
  if (top.length) console.log(`Most common differences (original -> re-coded): ${top.map(([k, v]) => `${k} ×${v}`).join(", ")}`);
}

main();
