/**
 * Gives each instructor-corrected error in the training pool a code from its
 * concept's approved taxonomy (the language pack's version, e.g. v2), with a
 * governance judge (a, OpenAI, by default). The instructor's correction,
 * checked by errors:verify, decides that the item is wrong; the judge only
 * says why, and writes the one-sentence analysis the fine-tuned evaluator
 * learns to produce. NONE when no code fits (the evaluator abstains on the
 * diagnosis).
 *
 *   npm run train:codes [-- --language es] [--corpus cowsl2h] [--judge a|b] [--concurrency 4]
 *   npm run train:codes -- --check 50 [--judge a]
 *
 * Reads data/train/<corpus>-pool.jsonl, appends to
 * data/train/codes-<language>-<taxonomy>.jsonl one line per item as it
 * completes, so an interrupted run resumes; each line records which judge
 * coded it.
 *
 * --check N re-codes a fixed sample of N items that the other judge coded,
 * into codes-<language>-<taxonomy>-check.jsonl (also resumable), and reports
 * how often the two judges pick the same code. The codes file is not changed.
 */
import "dotenv/config";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { parseArgs } from "util";
import { z } from "zod";
import { governanceConfig, governedJson, type JudgeId } from "@/lib/governance";
import { conceptTaxonomy, loadLanguage, type LanguagePack } from "@/lib/language";
import { progress } from "@/lib/progress";
import { renderCodes } from "@/lib/taxonomy";
import type { PoolItem } from "./train-export";

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

const instructions = (pack: LanguagePack, conceptName: string, codes: string) => `You are an expert ${pack.name} teacher and applied linguist. You will receive a short text written by a learner of ${pack.name}, the task prompt, and the change a teacher made to a ${conceptName} choice. The change is settled: the learner's form is wrong. Your job is to say why, using the codes below. Each code names a meaning contrast the learner got wrong in this response; it is not a guess about the learner's general strategy.

Return:
- diagnosis_code: the one code that best names the contrast the learner got wrong here; NONE if none fits. Read each code's "Is NOT this code" examples before choosing.
- error_span: the learner's wrong word(s), copied exactly from the response.
- correction: the teacher's form(s).
- analysis: 1-2 sentences in English, as a teacher would explain it: the target form, the meaning the learner intended, and why that meaning needs the corrected form. Do not mention the teacher.

## Codes for ${conceptName}

${codes}`;

async function main() {
  const { values } = parseArgs({
    options: {
      language: { type: "string", default: "es" },
      corpus: { type: "string", default: "cowsl2h" },
      judge: { type: "string", default: "a" },
      concurrency: { type: "string", default: "4" },
      check: { type: "string" },
    },
  });
  if (values.judge !== "a" && values.judge !== "b") throw new Error("--judge must be a or b");
  const config = governanceConfig(values.judge as JudgeId);
  const pack = loadLanguage(values.language!);
  // Per concept: its codes and the instructions that list them.
  const concepts = new Map(
    pack.concepts.map((c) => {
      const codes = conceptTaxonomy(pack, c.key);
      return [c.key, { valid: new Set(codes.map((t) => t.code)), instructions: instructions(pack, c.name, renderCodes(codes)) }];
    }),
  );
  const dir = path.join(process.cwd(), "data", "train");
  const POOL = path.join(dir, `${values.corpus}-pool.jsonl`);
  const OUT = path.join(dir, `codes-${pack.code}-${pack.taxonomy}.jsonl`);
  const CHECK = path.join(dir, `codes-${pack.code}-${pack.taxonomy}-check.jsonl`);
  const pool = fs.readFileSync(POOL, "utf-8").trim().split("\n").map((l) => JSON.parse(l) as PoolItem).filter((p) => p.language === pack.code);
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
  console.log(`${sample ? "Re-coding" : "Coding"} ${todo.length} errors with ${config.ref} against taxonomy ${pack.taxonomy} (${done.size} already done) into ${path.relative(process.cwd(), out)}.`);

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
          instructions: concepts.get(item.concept)!.instructions,
          input: JSON.stringify({
            prompt: item.prompt,
            response: item.response,
            instructor_changed: item.findings.map((f) => `${f.from} -> ${f.to}`),
          }),
        });
        const code = concepts.get(item.concept)!.valid.has(data.diagnosis_code) ? data.diagnosis_code : "NONE";
        fs.appendFileSync(out, JSON.stringify({ id: item.id, concept: item.concept, ...data, diagnosis_code: code, taxonomy: pack.taxonomy, coder: config.ref }) + "\n");
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
