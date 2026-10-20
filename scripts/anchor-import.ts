/**
 * Imports anchor items from COWS-L2H (UC Davis Corpus of Written Spanish, L2
 * and Heritage Speakers; Apache-2.0, https://github.com/ucdaviscl/cowsl2h):
 * learner sentences whose label comes from an instructor's correction, not
 * from a model (src/lib/gold/anchor.ts).
 *
 *   npm run anchor:import -- --source <cowsl2h clone> [--per-kind 40] [--dry-run]
 *
 * Keeps essays by English-L1 students in the courses closest to B1 (SPA 3,
 * 21-24) that have at least one correction. Each item is a learner sentence
 * with the one before it as context; only the second sentence may carry the
 * change. Samples --per-kind items of each kind (por/para changed, aspect
 * changed, unchanged target forms), deterministically. Items are added to
 * items.jsonl with source "learner" (so they are held-out) and the labels
 * are written as the set model_labels/anchor-cowsl2h.jsonl.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { parseArgs } from "util";
import { alignBySentence, sentences, targetChanges, untouchedTargets, type Finding } from "@/lib/gold/anchor";
import { addItems, itemIdFor, readItems, writeModelLabels, type Annotation, type GoldItem } from "@/lib/gold/store";

const SET = "anchor-cowsl2h";
const COURSES = /^SPA ?(3|21|22|23|24)(?!\d)/i;
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

type Kind = "por_para" | "aspect" | "unchanged";
interface Candidate {
  kind: Kind;
  essayId: string;
  topic: string;
  quarter: string;
  course: string;
  response: string;
  findings: Finding[];
  untouched: string[];
}

/** Minimal RFC 4180 CSV reader (quoted fields may hold commas and newlines). */
function readCsv(file: string): Record<string, string>[] {
  const text = fs.readFileSync(file, "utf-8");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let k = 0; k < text.length; k++) {
    const ch = text[k];
    if (quoted) {
      if (ch === '"' && text[k + 1] === '"') (field += '"'), k++;
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") row.push(field), (field = "");
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[k + 1] === "\n") k++;
      row.push(field), rows.push(row), (row = []), (field = "");
    } else field += ch;
  }
  if (field || row.length) row.push(field), rows.push(row);
  const [header, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, k) => [h, r[k] ?? ""])));
}

function candidates(source: string): Candidate[] {
  const out: Candidate[] = [];
  for (const file of fs.readdirSync(path.join(source, "csv")).filter((f) => f.endsWith(".csv"))) {
    for (const r of readCsv(path.join(source, "csv", file))) {
      if (!COURSES.test(r.course ?? "") || !/english/i.test(r["l1 language"] ?? "")) continue;
      const corrected = (r.corrected1 ?? "").trim();
      const essay = (r.essay ?? "").trim();
      if (!corrected || !essay) continue;
      const topic = (r.prompt ?? "").trim();
      if (!PROMPTS[topic]) continue;
      const sents = sentences(essay);
      const ops = alignBySentence(sents, corrected);
      const changes = ops.map(targetChanges);
      for (let k = 1; k < sents.length; k++) {
        const prev = changes[k - 1];
        const cur = changes[k];
        // Context sentence must be clean; current sentence must be readable.
        if (prev.findings.length || prev.unreadable || cur.unreadable) continue;
        const response = `${sents[k - 1]} ${sents[k]}`;
        // Fragments, anonymisation tags (*FIRST_NAME*, *CITY*) and long passages are skipped.
        if (response.length > 400 || response.includes("*")) continue;
        if (sents[k - 1].split(" ").length < 4 || sents[k].split(" ").length < 4) continue;
        const base = { essayId: r.id, topic, quarter: r.quarter, course: r.course, response, untouched: untouchedTargets(ops[k]) };
        if (cur.findings.length) {
          const kind: Kind = cur.findings.some((f) => f.kind === "por_para") ? "por_para" : "aspect";
          out.push({ ...base, kind, findings: cur.findings });
        } else if (base.untouched.length) {
          out.push({ ...base, kind: "unchanged", findings: [] });
        }
      }
    }
  }
  return out;
}

/** Deterministic sample: order by a hash, at most one item per essay per kind. */
function sample(list: Candidate[], n: number): Candidate[] {
  const key = (c: Candidate) => crypto.createHash("sha256").update(`${c.essayId}|${c.response}`).digest("hex");
  const seen = new Set<string>();
  return [...list]
    .sort((a, b) => key(a).localeCompare(key(b)))
    .filter((c) => !seen.has(c.essayId) && !!seen.add(c.essayId))
    .slice(0, n);
}

function main() {
  const { values } = parseArgs({
    options: { source: { type: "string" }, "per-kind": { type: "string", default: "40" }, "dry-run": { type: "boolean", default: false } },
  });
  if (!values.source) throw new Error("--source <path to a clone of ucdaviscl/cowsl2h> is required");
  const all = candidates(values.source);
  const byKind = (k: Kind) => all.filter((c) => c.kind === k);
  console.log(`Candidates: por/para ${byKind("por_para").length}, aspect ${byKind("aspect").length}, unchanged ${byKind("unchanged").length}`);
  const perKind = Number(values["per-kind"]);
  const picked = (["por_para", "aspect", "unchanged"] as Kind[]).flatMap((k) => sample(byKind(k), perKind));

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
    prompt: PROMPTS[c.topic],
    response: c.response,
    source: "learner",
    origin: `COWS-L2H essay ${c.essayId} (${c.topic} ${c.quarter}, ${c.course})`,
    created_at: now,
  }));
  const fresh = new Set(addItems(items).map((i) => i.id));
  const known = new Set(readItems().map((i) => i.id));
  const labels: Annotation[] = picked
    .map((c, k) => ({ c, id: items[k].id }))
    .filter(({ id }) => known.has(id))
    .map(({ c, id }) => ({
      item_id: id,
      annotator: SET,
      evaluation: c.kind === "unchanged" ? "correct" : "incorrect",
      // The corpus does not say which misconception caused an error.
      diagnosis_code: null,
      confidence: 3,
      notes:
        c.kind === "unchanged"
          ? `instructor kept: ${c.untouched.join(", ")}`
          : `instructor corrected: ${c.findings.map((f) => `${f.from} -> ${f.to}`).join("; ")}`,
      rationale: `COWS-L2H essay ${c.essayId}, correction 1 (graduate Spanish instructor).`,
      annotated_at: now,
    }));
  writeModelLabels(SET, labels);
  console.log(`Added ${fresh.size} items; ${labels.length} labels in model_labels/${SET}.jsonl.`);
}

main();
