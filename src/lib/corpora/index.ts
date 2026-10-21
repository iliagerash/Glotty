import crypto from "crypto";
import { cowsl2h } from "@/lib/corpora/cowsl2h";
import type { Corpus, CorpusEssay } from "@/lib/corpora/types";
import { alignBySentence } from "@/lib/gold/align";
import { labelWindow, type Concept, type Finding } from "@/lib/gold/concepts";
import { bySentence, isWord, textOf } from "@/lib/gold/morph";
import { readItems, splitOf } from "@/lib/gold/store";

export type { Corpus, CorpusEssay } from "@/lib/corpora/types";

export const CORPORA: Record<string, Corpus> = { cowsl2h };

export function corpus(key: string): Corpus {
  const c = CORPORA[key];
  if (!c) throw new Error(`Unknown corpus "${key}"; known: ${Object.keys(CORPORA).join(", ")}`);
  return c;
}

/**
 * Splits a corpus's students, not essays, so no student's writing is in two
 * sets: about 25% held-out, 15% dev (screening), 60% training (errors are
 * scarce, so held-out gets the larger share). Students whose sentences are
 * dev gold items have been used for tuning (Workflow v1 screened prompts
 * and the confidence floor on them), so they never land in held-out (they
 * go to dev instead). Students of the v1 held-out anchor set were only
 * measured once, in aggregate, and stay eligible.
 */
export function studentSplit(c: Corpus): (student: string) => "heldout" | "dev" | "train" {
  const prefix = new RegExp(`^${c.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} (?:essay|student) (\\S+?)[,\\s]`);
  const tuned = new Set(readItems().filter((i) => splitOf(i) === "dev").flatMap((i) => i.origin?.match(prefix)?.[1] ?? []));
  return (student) => {
    const h = crypto.createHash("sha256").update(`${c.key}:${student}`).digest().readUInt32BE(0) / 0x1_0000_0000;
    if (h < 0.25) return tuned.has(student) ? "dev" : "heldout";
    return h < 0.4 ? "dev" : "train";
  };
}

export interface Candidate {
  concept: string;
  kind: "error" | "correct";
  findings: Finding[];
  /** Target forms the corrector left as written. */
  untouched: string[];
  /** The context sentence and the current sentence, as the learner wrote them. */
  response: string;
  essay: CorpusEssay;
  /** Number of the current sentence in the essay; the context is the one before. */
  sentence: number;
}

/**
 * Two-sentence items from one essay, labelled for one concept by its
 * corrections (labelWindow). With two corrections, an item is kept only if
 * both read it and agree on error vs no error.
 */
export function candidates(essay: CorpusEssay, concept: Concept): Candidate[] {
  const sentences = bySentence(essay.essay);
  const aligned = essay.corrections.map((c) => alignBySentence(essay.essay, c));
  const out: Candidate[] = [];
  for (let k = 1; k < sentences.length; k++) {
    const [prev, cur] = [sentences[k - 1], sentences[k]];
    const response = textOf([...prev, ...cur]);
    // Fragments, anonymisation tags (*FIRST_NAME*, *CITY*) and long passages are skipped.
    if (response.length > 400 || response.includes("*")) continue;
    if (prev.filter(isWord).length < 4 || cur.filter(isWord).length < 4) continue;
    const labels = aligned.map((ops) => labelWindow(concept, ops[prev[0].sent] ?? [], ops[cur[0].sent] ?? []));
    if (labels.some((l) => l === null)) continue;
    if (labels.some((l) => l!.kind !== labels[0]!.kind)) continue;
    out.push({ concept: concept.key, ...labels[0]!, response, essay, sentence: k });
  }
  return out;
}
