/**
 * Exports a training pool for fine-tuning the evaluator from COWS-L2H
 * (Apache-2.0, https://github.com/ucdaviscl/cowsl2h), labelled by its
 * instructors' corrections with the same rules as the anchor sets
 * (src/lib/gold/anchor.ts).
 *
 *   npm run train:export -- --source <cowsl2h clone> [--correct 1000]
 *
 * Wider than the anchor sets on purpose: every L2 and heritage course, every
 * L1, and both corrections where an essay has two (a sentence the two
 * instructors label differently is left out). Essays used by any gold item
 * (the anchor sets) are excluded, so evaluation stays clean. Keeps every
 * error and a deterministic sample of --correct sentences with untouched
 * target forms. Writes data/train/cowsl2h-pool.jsonl.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { parseArgs } from "util";
import { alignBySentence, readCsv, sentences, targetChanges, untouchedTargets, type Finding } from "@/lib/gold/anchor";
import { itemIdFor, normalizeResponse, readItems } from "@/lib/gold/store";

const POOL = path.join(process.cwd(), "data", "train", "cowsl2h-pool.jsonl");

/** Spanish versions of the corpus prompts, as in anchor:import. */
const PROMPTS: Record<string, string> = {
  famous: "Escribe un texto sobre una persona famosa.",
  vacation: "Escribe un texto sobre tu plan de vacaciones perfecto.",
  special: "Escribe un texto sobre una persona especial en tu vida.",
  terrible: "Escribe un texto sobre una historia terrible.",
  yourself: "Escribe un texto para describirte.",
  beautiful: "Escribe un texto sobre una historia bonita.",
  place_you_dislike: "Escribe un texto sobre un lugar que no te gusta.",
  chaplin: "Describe la escena del fragmento de «The Kid», de Chaplin, que acabas de ver.",
};

export interface PoolItem {
  id: string;
  prompt: string;
  response: string;
  kind: "por_para" | "aspect" | "unchanged";
  findings: Finding[];
  untouched: string[];
  essay: string;
  group: "l2_english" | "l2_other" | "heritage";
}

type Label = { kind: PoolItem["kind"]; findings: Finding[]; untouched: string[] } | null;

/**
 * Labels the two-sentence item ending at sentence k. Unlike the anchor sets,
 * an error in the context sentence is allowed: the item is then incorrect
 * too, and its findings cover both sentences.
 */
function labelSentence(sents: string[], corrected: string, k: number, ops = alignBySentence(sents, corrected)): Label {
  const prev = targetChanges(ops[k - 1]);
  const cur = targetChanges(ops[k]);
  if (prev.unreadable || cur.unreadable) return null;
  const findings = [...prev.findings, ...cur.findings];
  const untouched = [...untouchedTargets(ops[k - 1]), ...untouchedTargets(ops[k])];
  if (findings.length) return { kind: findings.some((f) => f.kind === "por_para") ? "por_para" : "aspect", findings, untouched };
  return untouched.length ? { kind: "unchanged", findings: [], untouched } : null;
}

function main() {
  const { values } = parseArgs({ options: { source: { type: "string" }, correct: { type: "string", default: "1000" } } });
  if (!values.source) throw new Error("--source <path to a clone of ucdaviscl/cowsl2h> is required");
  const gold = readItems();
  const usedEssays = new Set(gold.flatMap((i) => i.origin?.match(/^COWS-L2H essay (\S+)/)?.[1] ?? []));
  const goldResponses = new Set(gold.map((i) => normalizeResponse(i.response)));

  const byKey = new Map<string, PoolItem>();
  let disagreements = 0;
  for (const file of fs.readdirSync(path.join(values.source, "csv")).filter((f) => f.endsWith(".csv"))) {
    for (const r of readCsv(path.join(values.source, "csv", file))) {
      const topic = (r.prompt ?? "").trim();
      const essay = (r.essay ?? "").trim();
      if (usedEssays.has(r.id) || !PROMPTS[topic] || !essay) continue;
      const course = Number((r.course ?? "").match(/\d+/)?.[0] ?? NaN);
      if (Number.isNaN(course)) continue;
      const group: PoolItem["group"] = course >= 30 ? "heritage" : /english/i.test(r["l1 language"] ?? "") ? "l2_english" : "l2_other";
      const corrections = [r.corrected1, r.corrected2].map((c) => (c ?? "").trim()).filter(Boolean);
      if (!corrections.length) continue;
      const sents = sentences(essay);
      const aligned = corrections.map((c) => alignBySentence(sents, c));
      for (let k = 1; k < sents.length; k++) {
        const response = `${sents[k - 1]} ${sents[k]}`;
        if (response.length > 400 || response.includes("*")) continue;
        if (sents[k - 1].split(" ").length < 4 || sents[k].split(" ").length < 4) continue;
        const labels = aligned.map((ops, n) => labelSentence(sents, corrections[n], k, ops));
        if (labels.some((l) => l === null)) continue;
        // Two instructors: use the sentence only if they agree on error vs no error.
        const isError = labels.map((l) => l!.kind !== "unchanged");
        if (isError.some((e) => e !== isError[0])) {
          disagreements++;
          continue;
        }
        const label = labels[0]!;
        const key = normalizeResponse(response);
        if (goldResponses.has(key) || byKey.has(key)) continue;
        byKey.set(key, { id: itemIdFor("train", response), prompt: PROMPTS[topic], response, ...label, essay: r.id, group });
      }
    }
  }

  const all = [...byKey.values()];
  const errors = all.filter((p) => p.kind !== "unchanged");
  const hash = (p: PoolItem) => crypto.createHash("sha256").update(p.id).digest("hex");
  const correct = all
    .filter((p) => p.kind === "unchanged")
    .sort((a, b) => hash(a).localeCompare(hash(b)))
    .slice(0, Number(values.correct));
  const pool = [...errors, ...correct];
  fs.mkdirSync(path.dirname(POOL), { recursive: true });
  fs.writeFileSync(POOL, pool.map((p) => JSON.stringify(p)).join("\n") + "\n");

  const count = (xs: PoolItem[], f: (p: PoolItem) => string) =>
    JSON.stringify(xs.reduce<Record<string, number>>((acc, p) => ({ ...acc, [f(p)]: (acc[f(p)] ?? 0) + 1 }), {}));
  console.log(`Excluded ${usedEssays.size} essays used by gold items; ${disagreements} sentences where two instructors disagreed.`);
  console.log(`Pool: ${pool.length} items, by kind ${count(pool, (p) => p.kind)}, by group ${count(pool, (p) => p.group)} -> ${path.relative(process.cwd(), POOL)}`);
}

main();
