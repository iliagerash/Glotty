import fs from "fs";
import path from "path";
import type { Corpus, CorpusEssay } from "@/lib/corpora/types";
import { readAnnotations, type Token } from "@/lib/gold/morph";

/**
 * COWS-L2H, the UC Davis Corpus of Written Spanish, L2 and Heritage Speakers
 * (Apache-2.0, https://github.com/ucdaviscl/cowsl2h), after `npm run
 * morph:prep` and tools/morph/annotate.py: essays with both instructor
 * corrections, tokenised and tagged by spaCy.
 */
const MORPH = path.join(process.cwd(), "data", "morph");

/** Spanish versions of the corpus prompts. */
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

const L1_CODES: Record<string, string> = {
  english: "en", spanish: "es", chinese: "zh", mandarin: "zh", cantonese: "yue", korean: "ko", vietnamese: "vi",
  tagalog: "tl", hindi: "hi", arabic: "ar", japanese: "ja", french: "fr", german: "de", portuguese: "pt", russian: "ru",
};

/** "English,Other" -> ["en", "other"]. */
function l1Codes(field: string): string[] {
  return field.split(/[,;/]/).map((s) => s.trim().toLowerCase()).filter(Boolean).map((s) => L1_CODES[s] ?? s);
}

/**
 * Course -> approximate CEFR level. SPA 1-2 are first-year courses; SPA 3
 * (end of first year) and the second-year SPA 21-24 are the closest to B1,
 * which is what the anchor sets have used; SPA 31-33 are heritage courses.
 * An approximation: COWS-L2H records courses, not tested levels.
 */
function level(course: number): string | null {
  if (course >= 30) return "heritage";
  if (course === 1) return "A1";
  if (course === 2) return "A2";
  if (course === 3 || (course >= 21 && course <= 24)) return "B1";
  return null;
}

export const cowsl2h: Corpus = {
  key: "cowsl2h",
  name: "COWS-L2H",
  language: "es",
  readEssays() {
    const tokens = readAnnotations(path.join(MORPH, "cowsl2h.jsonl"));
    const out: CorpusEssay[] = [];
    for (const line of fs.readFileSync(path.join(MORPH, "cowsl2h-input.jsonl"), "utf-8").split("\n")) {
      if (!line.trim()) continue;
      const r = JSON.parse(line);
      const t = tokens.get(r.id);
      const course = Number(String(r.course ?? "").match(/\d+/)?.[0] ?? NaN);
      if (!t || !PROMPTS[r.topic] || Number.isNaN(course)) continue;
      const corrections = [r.corrected1 ? t.corrected1 : null, r.corrected2 ? t.corrected2 : null].filter((c): c is Token[] => !!c?.length);
      if (!corrections.length) continue;
      out.push({
        id: r.id,
        student: r.student,
        l1: l1Codes(r.l1 ?? ""),
        level: level(course),
        prompt: PROMPTS[r.topic],
        essay: t.essay,
        corrections,
        meta: { topic: r.topic, quarter: r.quarter, course: `SPA ${course}` },
      });
    }
    return out;
  },
  origin: (e) => `COWS-L2H student ${e.student}, essay ${e.id} (${e.meta.course})`,
};
