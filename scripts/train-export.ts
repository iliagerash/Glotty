/**
 * Exports a training pool for fine-tuning the evaluator from a learner
 * corpus (Workflow v2), labelled by its native corrections with the same
 * concept detectors as the anchor sets (src/lib/gold/concepts.ts).
 *
 *   npm run train:export [-- --corpus cowsl2h] [--correct 450]
 *
 * Training students only (studentSplit), so no student is in an anchor set.
 * Wider than the anchor sets on purpose: every level and every L1, all of an
 * essay's corrections (an item they label differently is left out), and an
 * error in the context sentence counts. Within an essay, items never share a
 * sentence (each sentence is in two overlapping windows), so each correction
 * appears once; errors are chosen before correct items. Error items with more
 * than one correction are left out: the evaluator gives one code per
 * response, so they have no single right answer. For each concept of the
 * corpus's language, keeps every error and a deterministic sample of
 * --correct items with untouched target forms. Writes
 * data/train/<corpus>-pool.jsonl.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { parseArgs } from "util";
import { candidates, corpus as getCorpus, studentSplit } from "@/lib/corpora";
import { conceptsFor, type Finding } from "@/lib/gold/concepts";
import { progress } from "@/lib/progress";
import { itemIdFor, normalizeResponse, readItems } from "@/lib/gold/store";

export interface PoolItem {
  id: string;
  /** Target language code and the concept's key in its language pack. */
  language: string;
  concept: string;
  prompt: string;
  response: string;
  kind: "error" | "correct";
  findings: Finding[];
  untouched: string[];
  essay: string;
  student: string;
  l1: string[];
  level: string | null;
}

function main() {
  const { values } = parseArgs({ options: { corpus: { type: "string", default: "cowsl2h" }, correct: { type: "string", default: "450" } } });
  const source = getCorpus(values.corpus!);
  const POOL = path.join(process.cwd(), "data", "train", `${source.key}-pool.jsonl`);
  const split = studentSplit(source);
  const essays = source.readEssays().filter((e) => split(e.student) === "train");
  const goldResponses = new Set(readItems().map((i) => normalizeResponse(i.response)));
  const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

  const pool: PoolItem[] = [];
  for (const concept of Object.values(conceptsFor(source.language))) {
    const bar = progress(essays.length, `${concept.key}: reading training essays`);
    const byKey = new Map<string, PoolItem>();
    let multi = 0;
    for (const e of essays) {
      // Errors first, then correct items, each in hash order; skip windows sharing a sentence.
      const ordered = candidates(e, concept).sort((a, b) => (a.kind === b.kind ? hash(a.response).localeCompare(hash(b.response)) : a.kind === "error" ? -1 : 1));
      const usedSentences = new Set<number>();
      for (const c of ordered) {
        if (usedSentences.has(c.sentence) || usedSentences.has(c.sentence - 1)) continue;
        if (c.kind === "error" && c.findings.length > 1) {
          multi++;
          continue;
        }
        usedSentences.add(c.sentence).add(c.sentence - 1);
        const key = normalizeResponse(c.response);
        if (goldResponses.has(key) || byKey.has(key)) continue;
        byKey.set(key, {
          id: itemIdFor(`train-${source.language}-${concept.key}`, c.response),
          language: source.language,
          concept: concept.key,
          prompt: e.prompt,
          response: c.response,
          kind: c.kind,
          findings: c.findings,
          untouched: c.untouched,
          essay: e.id,
          student: e.student,
          l1: e.l1,
          level: e.level,
        });
      }
      bar.tick();
    }
    bar.done();
    const all = [...byKey.values()];
    const errors = all.filter((p) => p.kind === "error");
    const correct = all.filter((p) => p.kind === "correct").sort((a, b) => hash(a.id).localeCompare(hash(b.id))).slice(0, Number(values.correct));
    pool.push(...errors, ...correct);
    console.log(`${concept.key}: ${errors.length} errors, ${correct.length} correct (of ${all.length - errors.length}); ${multi} items with several corrections left out.`);
  }

  fs.mkdirSync(path.dirname(POOL), { recursive: true });
  fs.writeFileSync(POOL, pool.map((p) => JSON.stringify(p)).join("\n") + "\n");
  const count = (f: (p: PoolItem) => string) => JSON.stringify(pool.reduce<Record<string, number>>((acc, p) => ({ ...acc, [f(p)]: (acc[f(p)] ?? 0) + 1 }), {}));
  console.log(`Pool: ${pool.length} items, by concept/kind ${count((p) => `${p.concept}/${p.kind}`)}, by level ${count((p) => p.level ?? "unknown")} -> ${path.relative(process.cwd(), POOL)}`);
}

main();
