/**
 * Builds a concept's anchor sets from a learner corpus (Workflow v2):
 * learner sentences labelled by a native corrector, not by a model.
 *
 *   npm run anchor:import -- --concept <key> --split heldout|dev
 *       [--corpus cowsl2h] [--l1 en] [--level B1] [--per-kind 40] [--dry-run]
 *
 * The corpus adapter (src/lib/corpora) gives its essays with corrections and
 * the target language; the concept comes from that language's pack
 * (data/languages/<code>/language.json). Students are split once per corpus
 * (studentSplit): held-out students give model_labels/anchor-<lang>-<key>.jsonl,
 * dev students give anchor-<lang>-<key>-dev.jsonl. Only students with --l1
 * among their first languages, at --level. Each item is a learner sentence
 * with the one before it as context, labelled as a whole (labelWindow).
 * Samples up to --per-kind errors and as many correct items as errors
 * found, deterministically; items of one essay never share a sentence. Items are source
 * "learner"; dev items are pinned to dev.
 */
import crypto from "crypto";
import { parseArgs } from "util";
import { candidates, corpus as getCorpus, studentSplit, type Candidate } from "@/lib/corpora";
import { conceptsFor } from "@/lib/gold/concepts";
import { progress } from "@/lib/progress";
import { addItems, itemIdFor, readItems, writeModelLabels, type Annotation, type GoldItem } from "@/lib/gold/store";

/**
 * Deterministic sample, ordered by a hash. Items of one essay may not share a
 * sentence: each sentence is in two overlapping windows, so this counts each
 * error once while keeping separate errors of the same essay.
 */
function sample(list: Candidate[], n: number): Candidate[] {
  const key = (c: Candidate) => crypto.createHash("sha256").update(`${c.essay.id}|${c.response}`).digest("hex");
  const used = new Set<string>();
  const out: Candidate[] = [];
  for (const c of [...list].sort((a, b) => key(a).localeCompare(key(b)))) {
    const sentences = [`${c.essay.id}:${c.sentence - 1}`, `${c.essay.id}:${c.sentence}`];
    if (sentences.some((s) => used.has(s))) continue;
    sentences.forEach((s) => used.add(s));
    out.push(c);
    if (out.length === n) break;
  }
  return out;
}

function main() {
  const { values } = parseArgs({
    options: {
      concept: { type: "string" },
      split: { type: "string", default: "heldout" },
      corpus: { type: "string", default: "cowsl2h" },
      l1: { type: "string", default: "en" },
      level: { type: "string", default: "B1" },
      "per-kind": { type: "string", default: "40" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  const source = getCorpus(values.corpus!);
  const concepts = conceptsFor(source.language);
  const concept = concepts[values.concept ?? ""];
  if (!concept) throw new Error(`--concept must be one of ${Object.keys(concepts).join(", ")} (language ${source.language})`);
  if (values.split !== "heldout" && values.split !== "dev") throw new Error("--split must be heldout or dev");
  const set = `anchor-${source.language}-${concept.key}${values.split === "dev" ? "-dev" : ""}`;

  const split = studentSplit(source);
  const essays = source.readEssays().filter((e) => e.l1.includes(values.l1!) && e.level === values.level && split(e.student) === values.split);
  const bar = progress(essays.length, `reading ${values.split} essays`);
  const all: Candidate[] = [];
  for (const e of essays) {
    all.push(...candidates(e, concept));
    bar.tick();
  }
  bar.done();
  const errors = all.filter((c) => c.kind === "error");
  const correct = all.filter((c) => c.kind === "correct");
  console.log(`${source.language}/${concept.key}, ${values.split} students (${essays.length} essays): ${errors.length} error candidates, ${correct.length} correct candidates.`);
  const perKind = Number(values["per-kind"]);
  // Balanced: as many correct items as errors found, so a scarce concept isn't swamped by correct ones.
  const pickedErrors = sample(errors, perKind);
  const picked = [...pickedErrors, ...sample(correct, pickedErrors.length)];

  if (values["dry-run"]) {
    for (const c of picked) {
      const what = c.findings.map((f) => `${f.from} -> ${f.to}`).join("; ") || `kept: ${c.untouched.join(", ")}`;
      console.log(`[${c.kind}] ${c.response}\n    ${what}`);
    }
    return;
  }

  const now = new Date().toISOString();
  const items: GoldItem[] = picked.map((c) => ({
    id: itemIdFor("cows", c.response),
    prompt: c.essay.prompt,
    response: c.response,
    source: "learner",
    origin: source.origin(c.essay),
    ...(values.split === "dev" ? { split: "dev" as const } : {}),
    created_at: now,
  }));
  const fresh = addItems(items);
  const known = new Set(readItems().map((i) => i.id));
  const labels: Annotation[] = picked
    .map((c, k) => ({ c, id: items[k].id }))
    .filter(({ id }) => known.has(id))
    .map(({ c, id }) => ({
      item_id: id,
      annotator: set,
      evaluation: c.kind === "correct" ? "correct" : "incorrect",
      diagnosis_code: null,
      confidence: 3,
      notes: c.kind === "correct" ? `instructor kept: ${c.untouched.join(", ")}` : `instructor corrected: ${c.findings.map((f) => `${f.from} -> ${f.to}`).join("; ")}`,
      rationale: `${source.name} essay ${c.essay.id}, ${concept.key}, native correction${c.essay.corrections.length > 1 ? "s (all agree)" : ""}.`,
      annotated_at: now,
    }));
  writeModelLabels(set, labels);
  console.log(`Added ${fresh.length} items; ${labels.length} labels in model_labels/${set}.jsonl.`);
}

main();
