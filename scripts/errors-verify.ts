/**
 * Workflow v2 preference filter: instructors sometimes "correct" a form that
 * was already acceptable, and those corrections would teach the evaluator to
 * flag correct Spanish. A governance judge (a, OpenAI, by default) checks
 * every instructor-corrected error and says, per change, whether the
 * learner's form is a clear error, acceptable as written, or unclear. It can
 * only remove error labels, never add one.
 *
 *   npm run errors:verify -- --sets anchor-es-pret_imp,anchor-es-pret_imp-dev [--pool cowsl2h] [--concurrency 4]
 *
 * Verdicts are cached in data/verify/<language>.jsonl (resumable), then
 * applied: an item whose changes are all clear errors stays an error; all
 * acceptable, it becomes a correct example (the note keeps the instructor's
 * change); unclear or mixed, it is removed from the label set or pool (the
 * gold item itself stays). Label sets are anchor-<language>-<concept>[-dev];
 * the pool is data/train/<corpus>-pool.jsonl.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { parseArgs } from "util";
import { z } from "zod";
import { governanceConfig, governedJson, type JudgeId } from "@/lib/governance";
import { loadLanguage } from "@/lib/language";
import { progress } from "@/lib/progress";
import { readItems, readModelLabels, writeModelLabels, type Annotation } from "@/lib/gold/store";
import type { PoolItem } from "./train-export";

const VERDICTS = ["clear_error", "acceptable", "unclear"] as const;
const Result = z.object({
  changes: z.array(z.object({ from: z.string(), to: z.string(), verdict: z.enum(VERDICTS), reason: z.string() })),
});
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["changes"],
  properties: {
    changes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["from", "to", "verdict", "reason"],
        properties: { from: { type: "string" }, to: { type: "string" }, verdict: { type: "string", enum: [...VERDICTS] }, reason: { type: "string" } },
      },
    },
  },
};

const instructions = (language: string, concept: string) => `You are an experienced teacher of ${language} as a foreign language. A learner wrote the response below to the prompt; an instructor then changed some ${concept} choices. Instructors sometimes change a form that was already acceptable, as a matter of style or preference. For each change, judge only the ${concept} choice, nothing else in the sentence:
- clear_error: the learner's form is wrong on the natural reading of this response and prompt; a careful native teacher would mark it.
- acceptable: the learner's form is natural, acceptable ${language} here, even if the instructor's form is also good or better. Not merely possible under a strained reading.
- unclear: the intended meaning is too unclear to decide, or the learner's form and the correction are both off.
Return one entry per change, in the order given, with a one-sentence reason.`;

type Verdict = { key: string; changes: z.infer<typeof Result>["changes"]; verdict: "error" | "acceptable" | "drop"; verifier: string };
type Change = { from: string; to: string };
type Job = { key: string; concept: string; prompt: string; response: string; changes: Change[] };

const itemVerdict = (changes: Verdict["changes"]): Verdict["verdict"] =>
  changes.every((c) => c.verdict === "clear_error") ? "error" : changes.every((c) => c.verdict === "acceptable") ? "acceptable" : "drop";

/** "instructor corrected: fue -> era; para -> por" -> changes. */
const changesFromNotes = (notes = ""): Change[] =>
  notes.startsWith("instructor corrected:")
    ? notes.slice("instructor corrected:".length).split(";").map((s) => s.trim().split(" -> ")).filter((p) => p.length === 2).map(([from, to]) => ({ from, to }))
    : [];

async function main() {
  const { values } = parseArgs({
    options: { sets: { type: "string" }, pool: { type: "string" }, language: { type: "string", default: "es" }, judge: { type: "string", default: "a" }, concurrency: { type: "string", default: "4" } },
  });
  if (!values.sets && !values.pool) throw new Error("Give --sets <label sets> and/or --pool <corpus>");
  if (values.judge !== "a" && values.judge !== "b") throw new Error("--judge must be a or b");
  const config = governanceConfig(values.judge as JudgeId);
  const pack = loadLanguage(values.language!);
  const conceptName = (key: string) => pack.concepts.find((c) => c.key === key)?.name ?? key;
  const cacheFile = path.join(process.cwd(), "data", "verify", `${pack.code}.jsonl`);
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  const cache = new Map<string, Verdict>(
    fs.existsSync(cacheFile) ? fs.readFileSync(cacheFile, "utf-8").trim().split("\n").filter(Boolean).map((l) => [JSON.parse(l).key, JSON.parse(l)]) : [],
  );

  // Collect every corrected error to check, keyed by item and concept (an item can be in two concepts' sets).
  const items = new Map(readItems().map((i) => [i.id, i]));
  const sets = (values.sets ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const jobs = new Map<string, Job>();
  for (const set of sets) {
    const concept = set.replace(new RegExp(`^anchor-${pack.code}-`), "").replace(/-dev$/, "");
    for (const label of readModelLabels(set).values()) {
      const changes = changesFromNotes(label.notes);
      const item = items.get(label.item_id);
      if (label.evaluation !== "incorrect" || !changes.length || !item) continue;
      jobs.set(`${label.item_id}|${concept}`, { key: `${label.item_id}|${concept}`, concept, prompt: item.prompt, response: item.response, changes });
    }
  }
  const poolFile = values.pool ? path.join(process.cwd(), "data", "train", `${values.pool}-pool.jsonl`) : null;
  const pool = poolFile ? fs.readFileSync(poolFile, "utf-8").trim().split("\n").map((l) => JSON.parse(l) as PoolItem) : [];
  for (const p of pool.filter((p) => p.kind === "error")) {
    jobs.set(`${p.id}|${p.concept}`, { key: `${p.id}|${p.concept}`, concept: p.concept, prompt: p.prompt, response: p.response, changes: p.findings });
  }

  const todo = [...jobs.values()].filter((j) => !cache.has(j.key));
  console.log(`${jobs.size} corrected errors to verify (${jobs.size - todo.length} cached) with ${config.ref}.`);
  const bar = progress(todo.length, "verified");
  let next = 0;
  let failed = 0;
  async function worker() {
    while (next < todo.length) {
      const job = todo[next++];
      try {
        const { data } = await governedJson({
          config,
          name: "verify_correction",
          jsonSchema: SCHEMA,
          schema: Result,
          instructions: instructions(pack.name, conceptName(job.concept)),
          input: JSON.stringify({ prompt: job.prompt, response: job.response, changes: job.changes }),
        });
        if (data.changes.length !== job.changes.length) throw new Error(`expected ${job.changes.length} verdicts, got ${data.changes.length}`);
        const v: Verdict = { key: job.key, changes: data.changes, verdict: itemVerdict(data.changes), verifier: config.ref };
        fs.appendFileSync(cacheFile, JSON.stringify(v) + "\n");
        cache.set(job.key, v);
        bar.tick();
      } catch (err) {
        failed++;
        console.error(`\n  ${job.key}: ${(err as Error).message.slice(0, 200)}`);
        bar.tick(false);
      }
    }
  }
  await Promise.all(Array.from({ length: Number(values.concurrency) }, worker));
  bar.done();
  if (failed) {
    console.error(`${failed} failed; nothing applied. Re-run to retry them.`);
    process.exitCode = 1;
    return;
  }

  const note = (v: Verdict) => v.changes.map((c) => `${c.from} -> ${c.to}: ${c.verdict}`).join("; ");
  for (const set of sets) {
    const concept = set.replace(new RegExp(`^anchor-${pack.code}-`), "").replace(/-dev$/, "");
    const tally = { error: 0, acceptable: 0, drop: 0 };
    const out: Annotation[] = [];
    for (const label of readModelLabels(set).values()) {
      const v = cache.get(`${label.item_id}|${concept}`);
      if (label.evaluation !== "incorrect" || !v || !changesFromNotes(label.notes).length) {
        out.push(label);
        continue;
      }
      tally[v.verdict]++;
      if (v.verdict === "error") out.push({ ...label, rationale: `${label.rationale ?? ""} Verified as a clear error by ${v.verifier}.`.trim() });
      if (v.verdict === "acceptable")
        out.push({ ...label, evaluation: "correct", notes: `instructor changed ${label.notes!.slice("instructor corrected: ".length)}, but the learner's form is acceptable (${v.verifier})`, rationale: note(v) });
    }
    writeModelLabels(set, out);
    console.log(`${set}: ${tally.error} errors kept, ${tally.acceptable} now correct (acceptable as written), ${tally.drop} removed (unclear or mixed). ${out.length} labels.`);
  }
  if (poolFile) {
    const tally = { error: 0, acceptable: 0, drop: 0 };
    const out: PoolItem[] = [];
    for (const p of pool) {
      const v = p.kind === "error" ? cache.get(`${p.id}|${p.concept}`) : undefined;
      if (!v) {
        out.push(p);
        continue;
      }
      tally[v.verdict]++;
      if (v.verdict === "error") out.push(p);
      if (v.verdict === "acceptable") out.push({ ...p, kind: "correct", findings: [], untouched: [...p.untouched, ...p.findings.map((f) => f.from)] });
    }
    fs.writeFileSync(poolFile, out.map((p) => JSON.stringify(p)).join("\n") + "\n");
    console.log(`pool: ${tally.error} errors kept, ${tally.acceptable} now correct, ${tally.drop} removed. ${out.length} items.`);
  }
}

main();
