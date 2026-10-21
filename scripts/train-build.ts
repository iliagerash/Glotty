/**
 * Builds the fine-tuning files for the evaluator from the training pool
 * (train:export) and the judge's codes (train:codes), in the chat format
 * TRL's SFTTrainer reads: {"messages": [system, user, assistant]}.
 *
 *   npm run train:build
 *
 * The system turn is prompts/evaluator/v8-ft.md with the taxonomy codes by
 * name, the user turn is exactly what the evaluator sends (userMessage), and
 * the assistant turn is the verdict JSON. 10% of essays go to validation, so
 * no essay is in both. Also writes the anchor screening set in the same
 * format (eval-anchor-dev.jsonl), so a notebook can measure the adapter
 * before it is uploaded; the held-out anchor set is never exported.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { userMessage } from "@/lib/evaluator";
import { loadTaxonomy } from "@/lib/taxonomy";
import { readItems, readModelLabels } from "@/lib/gold/store";
import type { PoolItem } from "./train-export";

const DIR = path.join(process.cwd(), "data", "train");
const read = <T>(f: string): T[] => fs.readFileSync(path.join(DIR, f), "utf-8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
const write = (f: string, rows: unknown[]) => fs.writeFileSync(path.join(DIR, f), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");

export function systemPromptFt(): string {
  const codes = loadTaxonomy().map((t) => `- ${t.code}: ${t.name}`).join("\n");
  return fs.readFileSync(path.join(process.cwd(), "prompts", "evaluator", "v8-ft.md"), "utf-8").replace("{{CODES}}", codes).trim();
}

const PRET_IMP = "es.gram.aspect.pret_imp";
const POR_PARA = "es.sem.por_para";
const isPorPara = (w: string) => /^(por|para)$/i.test(w);

interface Code { id: string; diagnosis_code: string; error_span: string; correction: string; analysis: string }

function verdict(p: PoolItem, code?: Code) {
  if (p.kind === "unchanged") {
    const concepts = [...new Set(p.untouched.map((w) => (isPorPara(w) ? POR_PARA : PRET_IMP)))];
    return {
      analysis: `The target forms (${[...new Set(p.untouched)].join(", ")}) fit the most natural reading of the response.`,
      evaluation: "correct",
      confidence: 0.9,
      concept_ids: concepts,
      error_span: null,
      correction: null,
      diagnosis_code: null,
      diagnosis_confidence: null,
      clarifying_question: null,
      other_errors: [],
    };
  }
  const concepts = [...new Set(p.findings.map((f) => (f.kind === "por_para" ? POR_PARA : PRET_IMP)))];
  return {
    analysis: code!.analysis,
    evaluation: "incorrect",
    confidence: 0.95,
    concept_ids: concepts,
    error_span: code!.error_span,
    correction: code!.correction,
    diagnosis_code: code!.diagnosis_code,
    diagnosis_confidence: 0.8,
    clarifying_question: null,
    other_errors: [],
  };
}

function main() {
  const system = systemPromptFt();
  const pool = read<PoolItem>("cowsl2h-pool.jsonl");
  const codes = new Map(read<Code>("codes.jsonl").map((c) => [c.id, c]));
  const example = (p: { prompt: string; response: string }, answer: object) => ({
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMessage({ prompt: p.prompt, response: p.response }) },
      { role: "assistant", content: JSON.stringify(answer) },
    ],
  });
  const usable = pool.filter((p) => p.kind === "unchanged" || codes.has(p.id));
  const toVal = (essay: string) => crypto.createHash("sha256").update(essay).digest().readUInt32BE(0) / 0x1_0000_0000 < 0.1;
  const train = usable.filter((p) => !toVal(p.essay)).map((p) => example(p, verdict(p, codes.get(p.id))));
  const val = usable.filter((p) => toVal(p.essay)).map((p) => example(p, verdict(p, codes.get(p.id))));
  write("train.jsonl", train);
  write("val.jsonl", val);

  // The anchor screening set (dev), for measuring the adapter in the notebook.
  const labels = readModelLabels("anchor-cowsl2h-dev");
  const evalRows = readItems()
    .filter((i) => labels.has(i.id))
    .map((i) => ({ item_id: i.id, ...example(i, {}), gold: labels.get(i.id) }))
    .map(({ messages, ...rest }) => ({ ...rest, messages: messages.slice(0, 2) }));
  write("eval-anchor-dev.jsonl", evalRows);

  const tokens = (rows: { messages: { content: string }[] }[]) =>
    Math.round(rows.reduce((n, r) => n + r.messages.reduce((m, x) => m + x.content.length, 0), 0) / rows.length / 3.5);
  console.log(`Skipped ${pool.length - usable.length} errors without a code.`);
  console.log(`train.jsonl ${train.length}, val.jsonl ${val.length}, eval-anchor-dev.jsonl ${evalRows.length}; about ${tokens(train)} tokens per example.`);
}

main();
