/**
 * Gives each instructor-corrected error in the training pool a taxonomy code,
 * with a governance judge (b, Gemini, by default; --judge a for OpenAI). The instructor's correction decides that
 * the item is wrong; the judge only says why, from the taxonomy, and writes
 * the one-sentence analysis the fine-tuned evaluator learns to produce.
 *
 *   npm run train:codes [-- --judge a|b] [--concurrency 4]
 *
 * Reads data/train/cowsl2h-pool.jsonl, appends to data/train/codes.jsonl one
 * line per item as it completes, so an interrupted run resumes; each line
 * records which judge coded it.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { parseArgs } from "util";
import { z } from "zod";
import { renderTaxonomy } from "@/lib/evaluator";
import { governanceConfig, governedJson, type JudgeId } from "@/lib/governance";
import { taxonomyCodes } from "@/lib/taxonomy";
import type { PoolItem } from "./train-export";

const POOL = path.join(process.cwd(), "data", "train", "cowsl2h-pool.jsonl");
const OUT = path.join(process.cwd(), "data", "train", "codes.jsonl");

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
  const { values } = parseArgs({ options: { judge: { type: "string", default: "b" }, concurrency: { type: "string", default: "4" } } });
  if (values.judge !== "a" && values.judge !== "b") throw new Error("--judge must be a or b");
  const config = governanceConfig(values.judge as JudgeId);
  const codes = new Set(taxonomyCodes());
  const pool = fs.readFileSync(POOL, "utf-8").trim().split("\n").map((l) => JSON.parse(l) as PoolItem);
  const done = new Set(fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf-8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l).id) : []);
  const todo = pool.filter((p) => p.kind !== "unchanged" && !done.has(p.id));
  console.log(`Coding ${todo.length} errors with ${config.ref} (${done.size} already done).`);

  let next = 0;
  let failed = 0;
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
        fs.appendFileSync(OUT, JSON.stringify({ id: item.id, ...data, diagnosis_code: code, coder: config.ref }) + "\n");
      } catch (err) {
        failed++;
        console.error(`  ${item.id}: ${(err as Error).message.slice(0, 200)}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Number(values.concurrency) }, worker));
  const total = fs.readFileSync(OUT, "utf-8").trim().split("\n").length;
  console.log(`${total} coded in data/train/codes.jsonl${failed ? `; ${failed} failed, re-run to retry` : ""}.`);
  if (failed) process.exitCode = 1;
}

main();
