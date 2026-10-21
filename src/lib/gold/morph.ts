import fs from "fs";

/**
 * Tokens as tools/morph/annotate.py writes them (spaCy): text, lemma, part of
 * speech, morphological features, sentence number within the field, and
 * whether a space follows. Concept detectors (concepts.ts) read these.
 */
export interface Token {
  text: string;
  lemma: string;
  pos: string;
  feats: Record<string, string>;
  sent: number;
  space: boolean;
}

type Row = [string, string, string, string, number, number];

export function toToken([text, lemma, pos, feats, sent, space]: Row): Token {
  return {
    text,
    lemma,
    pos,
    feats: Object.fromEntries(feats.split("|").filter((f) => f.includes("=")).map((f) => f.split("=") as [string, string])),
    sent,
    space: space === 1,
  };
}

/** Annotated records by id: each field's tokens. */
export function readAnnotations(file: string): Map<string, Record<string, Token[]>> {
  const out = new Map<string, Record<string, Token[]>>();
  for (const line of fs.readFileSync(file, "utf-8").split("\n")) {
    if (!line.trim()) continue;
    const { id, fields } = JSON.parse(line) as { id: string; fields: Record<string, Row[]> };
    out.set(id, Object.fromEntries(Object.entries(fields).map(([k, rows]) => [k, rows.map(toToken)])));
  }
  return out;
}

/** Accent- and case-folded text, for comparing words and lemmas. */
export const fold = (w: string) => w.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export const isWord = (t: Token) => t.pos !== "PUNCT" && t.pos !== "SYM" && t.pos !== "SPACE";

/** The tokens grouped by sentence, in order. */
export function bySentence(tokens: Token[]): Token[][] {
  const out: Token[][] = [];
  for (const t of tokens) (out[t.sent] ??= []).push(t);
  return out.filter(Boolean);
}

/** The text of some tokens, as written. */
export function textOf(tokens: Token[]): string {
  return tokens.map((t, i) => t.text + (t.space && i < tokens.length - 1 ? " " : "")).join("").trim();
}
