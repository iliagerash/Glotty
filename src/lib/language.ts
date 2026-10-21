import fs from "fs";
import path from "path";
import type { TaxonomyCode } from "@/lib/taxonomy";

/**
 * A target language as data (Workflow v2): data/languages/<code>/language.json.
 * Adding a language or a concept is a new pack or a new spec, not new code,
 * as long as the concept fits a generic detector (src/lib/gold/concepts.ts).
 */

/** Same lemma, one feature changed between two values (e.g. Tense Past <-> Imp). */
export interface FeatureSwapSpec {
  key: string;
  cluster: string;
  name: string;
  /** Prefix of the concept's taxonomy codes, e.g. "ASP" for ASP.01. */
  code_prefix: string;
  /** Concept-specific rules for judging whether a corrector's change fixed a clear error (scripts/errors-verify.ts). */
  verify_guidance?: string;
  detector: "feature-swap";
  pos: string[];
  /** Features every target token must have (e.g. VerbForm=Fin, Mood=Ind). */
  require?: Record<string, string>;
  feature: string;
  values: [string, string];
}

/** One word of a set replaced by another of the same set (e.g. por <-> para). */
export interface WordSwapSpec {
  key: string;
  cluster: string;
  name: string;
  /** Prefix of the concept's taxonomy codes, e.g. "ASP" for ASP.01. */
  code_prefix: string;
  /** Concept-specific rules for judging whether a corrector's change fixed a clear error (scripts/errors-verify.ts). */
  verify_guidance?: string;
  detector: "word-swap";
  words: string[];
  /** Parts of speech that are never targets (e.g. "para" as a form of parar). */
  exclude_pos?: string[];
}

export type ConceptSpec = FeatureSwapSpec | WordSwapSpec;

export interface LanguagePack {
  code: string;
  name: string;
  /** spaCy model for tools/morph/annotate.py. */
  spacy_model: string;
  /** Approved taxonomy version: data/taxonomy/<code>/<taxonomy>-<concept key>.json. */
  taxonomy: string;
  concepts: ConceptSpec[];
}

/** A concept's codes in the pack's approved taxonomy version. */
export function conceptTaxonomy(pack: LanguagePack, key: string): TaxonomyCode[] {
  const file = path.join(process.cwd(), "data", "taxonomy", pack.code, `${pack.taxonomy}-${key}.json`);
  if (!fs.existsSync(file)) throw new Error(`No ${pack.taxonomy} taxonomy for ${pack.code}/${key} (${path.relative(process.cwd(), file)})`);
  return JSON.parse(fs.readFileSync(file, "utf-8")) as TaxonomyCode[];
}

export function loadLanguage(code: string): LanguagePack {
  const file = path.join(process.cwd(), "data", "languages", code, "language.json");
  if (!fs.existsSync(file)) throw new Error(`No language pack for "${code}" (${path.relative(process.cwd(), file)})`);
  return JSON.parse(fs.readFileSync(file, "utf-8")) as LanguagePack;
}
