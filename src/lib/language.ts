import fs from "fs";
import path from "path";

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
  concepts: ConceptSpec[];
}

export function loadLanguage(code: string): LanguagePack {
  const file = path.join(process.cwd(), "data", "languages", code, "language.json");
  if (!fs.existsSync(file)) throw new Error(`No language pack for "${code}" (${path.relative(process.cwd(), file)})`);
  return JSON.parse(fs.readFileSync(file, "utf-8")) as LanguagePack;
}
