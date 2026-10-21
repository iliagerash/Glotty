import type { Token } from "@/lib/gold/morph";

/**
 * A learner corpus with native corrections, behind one interface (Workflow
 * v2), so anchor sets and training pools come from any corpus and any target
 * language the same way. Each adapter maps its corpus to CorpusEssay.
 */
export interface CorpusEssay {
  /** Unique within the corpus. */
  id: string;
  student: string;
  /** The learner's first languages as ISO 639-1 codes ("en"); a lower-cased name when there is no code. */
  l1: string[];
  /** CEFR level (A1-C2) where the corpus allows one, "heritage" for heritage speakers, otherwise null. */
  level: string | null;
  /** The task prompt, in the target language. */
  prompt: string;
  essay: Token[];
  /** One or more native corrections of the same essay. */
  corrections: Token[][];
  /** Corpus-specific details kept for reference (course, term, topic). */
  meta: Record<string, string>;
}

export interface Corpus {
  key: string;
  /** Display name, also the prefix of gold items' origin. */
  name: string;
  /** Target language code (data/languages/<code>). */
  language: string;
  readEssays(): CorpusEssay[];
  /** Where a gold item came from, e.g. "COWS-L2H student 123, essay 123-famous-F17 (SPA 21)". */
  origin(essay: CorpusEssay): string;
}
