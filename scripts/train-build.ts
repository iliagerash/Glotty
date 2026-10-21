/**
 * Builds the fine-tuning files for the evaluator (Workflow v2, step 5), one
 * concept per example, in the chat format TRL and the Kaggle notebook read:
 * {"concept", "messages": [system, user, assistant]}.
 *
 *   npm run train:build [-- --language es] [--corpus cowsl2h] [--per-code 60] [--phrase-cap 3]
 *
 * Errors: every real instructor-corrected error (data/train/<corpus>-pool.jsonl,
 * filtered by errors:verify, coded by train:codes in codes-<lang>-<taxonomy>.jsonl),
 * then injected errors (data/train/inject-pool.jsonl) only to top up codes
 * below --per-code, with at most --phrase-cap injected errors per swapped
 * phrase (so "para favor" can't dominate). Correct items: about 1.5 per
 * error, real first, then injected originals. Not applicable: about 5% of a
 * concept's items, Tatoeba sentences with no target form of that concept.
 *
 * The system turn is prompts/evaluator/v8-ft.md for the concept (its approved
 * codes by name), the user turn is exactly what the evaluator sends
 * (userMessage), the assistant turn is the verdict JSON. 10% of essays or
 * source sentences go to validation, so none is in both. Also writes each
 * concept's screening anchor set (anchor-<lang>-<concept>-dev) in the same
 * format, for measuring the adapter in the notebook; held-out anchors are
 * never exported.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { parseArgs } from "util";
import { userMessage } from "@/lib/evaluator";
import { systemPromptFt } from "@/lib/evaluator/ft";
import { conceptsFor } from "@/lib/gold/concepts";
import { readAnnotations } from "@/lib/gold/morph";
import { readItems, readModelLabels } from "@/lib/gold/store";
import { loadLanguage } from "@/lib/language";
import type { PoolItem } from "./train-export";

const DIR = path.join(process.cwd(), "data", "train");
const MORPH = path.join(process.cwd(), "data", "morph");
const readJsonl = <T>(file: string): T[] =>
  fs.existsSync(file) ? fs.readFileSync(file, "utf-8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const write = (f: string, rows: unknown[]) => fs.writeFileSync(path.join(DIR, f), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

interface Code { diagnosis_code: string; error_span: string; correction: string; analysis: string }
type Item = PoolItem & { code?: Code; source?: string };

function verdict(kind: "error" | "correct" | "not_applicable", cluster: string, item?: Item) {
  const base = { concept_ids: kind === "not_applicable" ? [] : [cluster], clarifying_question: null, other_errors: [] };
  if (kind === "not_applicable") {
    return { analysis: "The response contains no form that this point is about.", evaluation: "not_applicable", confidence: 0.95, error_span: null, correction: null, diagnosis_code: null, diagnosis_confidence: null, ...base };
  }
  if (kind === "correct") {
    const forms = [...new Set(item!.untouched)].join(", ");
    return { analysis: `The forms (${forms}) fit the most natural reading of the response.`, evaluation: "correct", confidence: 0.9, error_span: null, correction: null, diagnosis_code: null, diagnosis_confidence: null, ...base };
  }
  const c = item!.code!;
  const coded = c.diagnosis_code && c.diagnosis_code !== "NONE";
  return {
    analysis: c.analysis,
    evaluation: "incorrect",
    confidence: 0.95,
    error_span: c.error_span,
    correction: c.correction,
    diagnosis_code: coded ? c.diagnosis_code : null,
    diagnosis_confidence: coded ? 0.8 : null,
    ...base,
  };
}

/** The swapped word and the word after it, e.g. "para favor": injected errors repeat these. */
function phraseOf(item: Item): string {
  const swapped = item.findings[0]?.from.toLowerCase() ?? "";
  const words = item.response.toLowerCase().replace(/[¿¡.,;:!?«»"]/g, " ").split(/\s+/).filter(Boolean);
  const i = words.indexOf(swapped);
  return i < 0 ? swapped : `${swapped} ${words[i + 1] ?? ""}`;
}

function main() {
  const { values } = parseArgs({
    options: {
      language: { type: "string", default: "es" },
      corpus: { type: "string", default: "cowsl2h" },
      "per-code": { type: "string", default: "60" },
      "phrase-cap": { type: "string", default: "3" },
    },
  });
  const pack = loadLanguage(values.language!);
  const concepts = conceptsFor(pack.code);
  const perCode = Number(values["per-code"]);
  const phraseCap = Number(values["phrase-cap"]);

  const codes = new Map(readJsonl<Code & { id: string }>(path.join(DIR, `codes-${pack.code}-${pack.taxonomy}.jsonl`)).map((c) => [c.id, c]));
  const real = readJsonl<Item>(path.join(DIR, `${values.corpus}-pool.jsonl`))
    .filter((p) => p.language === pack.code)
    .map((p) => (p.kind === "error" ? { ...p, code: codes.get(p.id) } : p));
  const injected = readJsonl<Item>(path.join(DIR, "inject-pool.jsonl")).filter((p) => p.language === pack.code);
  const tatoeba = fs.existsSync(path.join(MORPH, "tatoeba.jsonl")) ? readAnnotations(path.join(MORPH, "tatoeba.jsonl")) : new Map();
  const tatoebaText = new Map(readJsonl<{ id: string; en: string; es: string }>(path.join(MORPH, "tatoeba-input.jsonl")).map((r) => [r.id, r]));

  const toVal = (group: string) => parseInt(hash(group).slice(0, 8), 16) / 0x1_0000_0000 < 0.1;
  const train: object[] = [];
  const val: object[] = [];
  const report: string[] = [];

  for (const spec of pack.concepts) {
    const system = systemPromptFt(pack, spec.key);
    const concept = concepts[spec.key];
    const example = (prompt: string, response: string, answer: object) => ({
      concept: spec.key,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage({ prompt, response }) },
        { role: "assistant", content: JSON.stringify(answer) },
      ],
    });
    const byHash = <T extends { id: string }>(xs: T[]) => [...xs].sort((a, b) => hash(a.id).localeCompare(hash(b.id)));

    // Errors: all real ones with a code record, then injected ones topping up codes below perCode.
    const realErrors = real.filter((p) => p.concept === spec.key && p.kind === "error" && p.code);
    const count = new Map<string, number>();
    for (const e of realErrors) count.set(e.code!.diagnosis_code, (count.get(e.code!.diagnosis_code) ?? 0) + 1);
    const phrases = new Map<string, number>();
    const topUp: Item[] = [];
    for (const e of byHash(injected.filter((p) => p.concept === spec.key && p.kind === "error" && p.code && p.code.diagnosis_code !== "NONE"))) {
      const code = e.code!.diagnosis_code;
      const phrase = phraseOf(e);
      if ((count.get(code) ?? 0) >= perCode || (phrases.get(phrase) ?? 0) >= phraseCap) continue;
      count.set(code, (count.get(code) ?? 0) + 1);
      phrases.set(phrase, (phrases.get(phrase) ?? 0) + 1);
      topUp.push(e);
    }
    const errors = [...realErrors, ...topUp];

    // Correct: about 1.5 per error, real first (half), then injected originals.
    const wantCorrect = Math.round(errors.length * 1.5);
    const realCorrect = byHash(real.filter((p) => p.concept === spec.key && p.kind === "correct")).slice(0, Math.ceil(wantCorrect / 2));
    const injCorrect = byHash(injected.filter((p) => p.concept === spec.key && p.kind === "correct")).slice(0, wantCorrect - realCorrect.length);
    const correct = [...realCorrect, ...injCorrect];

    // Not applicable: Tatoeba sentences with no target form of this concept, about 5% of the concept's items.
    const wantNa = Math.round((errors.length + correct.length) * 0.05);
    const na = [...tatoeba]
      .filter(([, f]) => (f.es ?? []).length && !(f.es ?? []).some(concept.isTarget))
      .map(([id]) => id)
      .sort((a, b) => hash(`${spec.key}|${a}`).localeCompare(hash(`${spec.key}|${b}`)))
      .slice(0, wantNa);

    const add = (group: string, ex: object) => (toVal(group) ? val : train).push(ex);
    for (const e of errors) add(e.essay, example(e.prompt, e.response, verdict("error", concept.cluster, e)));
    for (const c of correct) add(c.essay, example(c.prompt, c.response, verdict("correct", concept.cluster, c)));
    for (const id of na) {
      const t = tatoebaText.get(id)!;
      add(id, example(`Traduce al español: «${t.en}»`, t.es, verdict("not_applicable", concept.cluster)));
    }
    const byCode = [...count].sort().map(([k, v]) => `${k} ${v}`).join(", ");
    report.push(`${spec.key}: ${errors.length} errors (${realErrors.length} real + ${topUp.length} injected; by code ${byCode}), ${correct.length} correct (${realCorrect.length} real), ${na.length} not applicable.`);
  }

  write("train.jsonl", train);
  write("val.jsonl", val);

  // The screening anchors, per concept, for measuring the adapter before upload.
  const items = new Map(readItems().map((i) => [i.id, i]));
  const evalRows: object[] = [];
  for (const spec of pack.concepts) {
    const set = `anchor-${pack.code}-${spec.key}-dev`;
    const system = systemPromptFt(pack, spec.key);
    for (const label of readModelLabels(set).values()) {
      const item = items.get(label.item_id);
      if (!item) continue;
      evalRows.push({
        item_id: item.id,
        concept: spec.key,
        gold: label,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMessage({ prompt: item.prompt, response: item.response }) },
        ],
      });
    }
  }
  write("eval-anchor-dev.jsonl", evalRows);

  const tokens = (rows: { messages: { content: string }[] }[]) =>
    Math.round(rows.reduce((n, r) => n + r.messages.reduce((m, x) => m + x.content.length, 0), 0) / Math.max(1, rows.length) / 3.5);
  console.log(report.join("\n"));
  console.log(`train.jsonl ${train.length}, val.jsonl ${val.length}, eval-anchor-dev.jsonl ${evalRows.length}; about ${tokens(train as never)} tokens per example.`);
}

main();
