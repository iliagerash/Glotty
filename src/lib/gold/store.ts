import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { Evaluation } from "@/lib/evaluator";

/**
 * The gold set (§24) lives in append-only JSONL files under data/gold so it
 * is versioned with the code and reproducible in benchmark reports.
 *
 *   items.jsonl                  responses to be labelled (no labels)
 *   annotations/<annotator>.jsonl one file per human annotator
 *   adjudications.jsonl          third-party decisions on disagreements
 *   model_labels/<name>.jsonl    labels written by an LLM ("silver"); same
 *                                shape as annotations, never mixed with them
 *   generator_intent.jsonl       what a generator *meant* to produce; never
 *                                shown to annotators, never used as gold
 */

export type ItemSource = "learner" | "hand_written" | "llm_synthetic" | "legacy_synthetic";

export interface GoldItem {
  id: string;
  prompt: string;
  response: string;
  source: ItemSource;
  /** Optional note on where the item came from (e.g. generator, learner id). */
  origin?: string;
  created_at: string;
}

export interface Annotation {
  item_id: string;
  annotator: string;
  evaluation: Evaluation;
  diagnosis_code: string | null;
  /** 1 = guess, 2 = fairly sure, 3 = certain. */
  confidence: 1 | 2 | 3;
  notes?: string;
  /** Model label sets only: the model's one-line justification. */
  rationale?: string;
  annotated_at: string;
}

/** A decision on an item whose labels disagree. Stored in adjudications.jsonl. */
export interface AdjudicationRecord extends Annotation {
  /** True when no rule settles the item; it then has no gold label. */
  contested?: boolean;
  /** Id from data/gold/rules.json of the rule that decided it. */
  rule?: string;
  /** Whose label was upheld: an annotator or model label set name, or "other". */
  chose?: string;
}

export interface GeneratorIntent {
  item_id: string;
  evaluation: Evaluation;
  diagnosis_code: string | null;
  kind: string;
  generator: string;
  /** The generator's own justification for the label; for reviewing the generator only. */
  rationale?: string;
}

export const GOLD_DIR = path.join(process.cwd(), "data", "gold");
const ITEMS = path.join(GOLD_DIR, "items.jsonl");
const ANNOTATIONS_DIR = path.join(GOLD_DIR, "annotations");
const ADJUDICATIONS = path.join(GOLD_DIR, "adjudications.jsonl");
const MODEL_LABELS_DIR = path.join(GOLD_DIR, "model_labels");
const INTENT = path.join(GOLD_DIR, "generator_intent.jsonl");

/** Share of items reserved for the held-out split (§24). */
export const HELDOUT_SHARE = 0.3;

export type Split = "dev" | "heldout";

/** Deterministic, so an item never moves between splits. */
export function splitOf(itemId: string): Split {
  const h = crypto.createHash("sha256").update(itemId).digest();
  return h.readUInt32BE(0) / 0x1_0000_0000 < HELDOUT_SHARE ? "heldout" : "dev";
}

export function normalizeResponse(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

export function itemIdFor(prefix: string, response: string): string {
  const h = crypto.createHash("sha256").update(normalizeResponse(response)).digest("hex");
  return `${prefix}-${h.slice(0, 10)}`;
}

function readJsonl<T>(file: string): T[] {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf-8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as T);
}

function appendJsonl(file: string, rows: object[]): void {
  if (!rows.length) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
}

function writeJsonl(file: string, rows: object[]): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, rows.map((r) => JSON.stringify(r) + "\n").join(""));
}

export function readItems(): GoldItem[] {
  return readJsonl<GoldItem>(ITEMS);
}

/** Adds items, skipping any whose normalized response already exists. */
export function addItems(items: GoldItem[]): GoldItem[] {
  const seen = new Set(readItems().map((i) => normalizeResponse(i.response)));
  const fresh: GoldItem[] = [];
  for (const item of items) {
    const key = normalizeResponse(item.response);
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push(item);
  }
  appendJsonl(ITEMS, fresh);
  return fresh;
}

export function annotatorFile(annotator: string): string {
  if (!/^[a-z0-9_-]{1,40}$/.test(annotator)) {
    throw new Error("Annotator name must be 1-40 chars of a-z, 0-9, _ or -");
  }
  return path.join(ANNOTATIONS_DIR, `${annotator}.jsonl`);
}

export function listAnnotators(): string[] {
  if (!fs.existsSync(ANNOTATIONS_DIR)) return [];
  return fs
    .readdirSync(ANNOTATIONS_DIR)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => f.replace(/\.jsonl$/, ""));
}

/** Latest annotation per item for one annotator (later lines override earlier). */
export function readAnnotations(annotator: string): Map<string, Annotation> {
  const latest = new Map<string, Annotation>();
  for (const a of readJsonl<Annotation>(annotatorFile(annotator))) latest.set(a.item_id, a);
  return latest;
}

const NAME = /^[a-z0-9_.-]{1,60}$/;

export function modelLabelFile(name: string): string {
  if (!NAME.test(name)) throw new Error("Model label set name must be 1-60 chars of a-z, 0-9, _, . or -");
  return path.join(MODEL_LABELS_DIR, `${name}.jsonl`);
}

export function readModelLabels(name: string): Map<string, Annotation> {
  const file = modelLabelFile(name);
  if (!fs.existsSync(file)) throw new Error(`No model labels named "${name}" (${path.relative(process.cwd(), file)})`);
  return new Map(readJsonl<Annotation>(file).map((a) => [a.item_id, a]));
}

/** Adds labels to a set, e.g. one at a time while a labelling run progresses. */
export function appendModelLabels(name: string, labels: Annotation[]): void {
  appendJsonl(modelLabelFile(name), labels);
}

/** Like readModelLabels, but an empty map when the set does not exist yet. */
export function readModelLabelsIfAny(name: string): Map<string, Annotation> {
  return new Map(readJsonl<Annotation>(modelLabelFile(name)).map((a) => [a.item_id, a]));
}

/** Replaces the whole set: a model label set is imported as one batch. */
export function writeModelLabels(name: string, labels: Annotation[]): void {
  writeJsonl(modelLabelFile(name), labels);
}

export function readAdjudications(): Map<string, AdjudicationRecord> {
  const latest = new Map<string, AdjudicationRecord>();
  for (const a of readJsonl<AdjudicationRecord>(ADJUDICATIONS)) latest.set(a.item_id, a);
  return latest;
}

export function appendAdjudication(a: AdjudicationRecord): void {
  appendJsonl(ADJUDICATIONS, [a]);
}

export function readGeneratorIntent(): Map<string, GeneratorIntent> {
  return new Map(readJsonl<GeneratorIntent>(INTENT).map((g) => [g.item_id, g]));
}

export function appendGeneratorIntent(rows: GeneratorIntent[]): void {
  appendJsonl(INTENT, rows);
}
