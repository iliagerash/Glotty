/**
 * Anchor items from native-corrected learner corpora (plan: "anchor set").
 * A learner sentence and its instructor correction are aligned word by word;
 * the correction, not a model, decides the label:
 *
 *   - the instructor changed a por/para, or swapped a preterite for an
 *     imperfect of the same verb (or back) → incorrect;
 *   - the sentence has por/para or a past form the instructor left as it
 *     was, and no such change → correct.
 *
 * Other corrections (gender, spelling, word choice) do not affect the label,
 * as in GUIDELINES.md. The detection favours precision: a change it cannot
 * read as one of these two is not used.
*/

import fs from "fs";

export type Op = { kind: "equal" | "change"; learner: string[]; corrected: string[] };

/** Words, with punctuation dropped; case and accents are kept for display. */
export function words(text: string): string[] {
  return text.match(/[\p{L}]+/gu) ?? [];
}

const fold = (w: string) => w.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

type Step = { kind: "equal" | "change"; i?: number; j?: number };

/** Word-level alignment path (LCS on accent- and case-folded words). */
function alignPath(learner: string[], corrected: string[]): Step[] {
  const a = learner.map(fold);
  const b = corrected.map(fold);
  const n = a.length;
  const m = b.length;
  const lcs = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const path: Step[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) path.push({ kind: "equal", i: i++, j: j++ });
    else if (j < m && (i === n || lcs[i][j + 1] >= lcs[i + 1][j])) path.push({ kind: "change", j: j++ });
    else path.push({ kind: "change", i: i++ });
  }
  return path;
}

function toOps(steps: Step[], learner: string[], corrected: string[]): Op[] {
  const ops: Op[] = [];
  for (const s of steps) {
    let last = ops[ops.length - 1];
    if (last?.kind !== s.kind) ops.push((last = { kind: s.kind, learner: [], corrected: [] }));
    if (s.i !== undefined) last.learner.push(learner[s.i]);
    if (s.j !== undefined) last.corrected.push(corrected[s.j]);
  }
  return ops;
}

/** Word-level alignment of two texts. */
export function align(learner: string[], corrected: string[]): Op[] {
  return toOps(alignPath(learner, corrected), learner, corrected);
}

/**
 * Aligns a whole essay with its correction and splits the alignment at the
 * learner's sentence boundaries, so a correction that moves words between
 * sentences still lands on the right one. Inserted words go to the sentence
 * of the learner word before them.
 */
export function alignBySentence(learnerSentences: string[], correctedText: string): Op[][] {
  const perSentence = learnerSentences.map(words);
  const learner = perSentence.flat();
  const corrected = words(correctedText);
  const owner: number[] = perSentence.flatMap((ws, k) => ws.map(() => k));
  const buckets: Step[][] = learnerSentences.map(() => []);
  let current = 0;
  for (const step of alignPath(learner, corrected)) {
    if (step.i !== undefined) current = owner[step.i];
    buckets[current]?.push(step);
  }
  return buckets.map((steps) => toOps(steps, learner, corrected));
}

const POR_PARA = new Set(["por", "para"]);

const IMPERFECT_IRREGULAR = new Set(["era", "eras", "eramos", "eran", "iba", "ibas", "ibamos", "iban", "veia", "veias", "veiamos", "veian"]);
const PRETERITE_IRREGULAR = new Set([
  "fui", "fuiste", "fue", "fuimos", "fueron", "tuve", "tuviste", "tuvo", "tuvimos", "tuvieron", "estuve", "estuviste",
  "estuvo", "estuvimos", "estuvieron", "hice", "hiciste", "hizo", "hicimos", "hicieron", "pude", "pudiste", "pudo",
  "pudimos", "pudieron", "puse", "puso", "pusieron", "supe", "supo", "supieron", "quise", "quiso", "quisieron", "dije",
  "dijo", "dijeron", "vine", "vino", "vinieron", "traje", "trajo", "trajeron", "di", "dio", "dieron", "vi", "vio",
  "vieron", "hubo", "anduve", "anduvo", "conduje", "condujo",
]);
/** Irregular preterite stem → imperfect stem, for pairing forms of one verb. */
const IRREGULAR_PAIRS: [RegExp, RegExp][] = [
  [/^(fu)/, /^(er|ib)/], [/^tuv/, /^ten/], [/^estuv/, /^estab/], [/^hic|^hiz/, /^hac/], [/^pud/, /^pod/],
  [/^pus/, /^pon/], [/^sup/, /^sab/], [/^quis/, /^quer/], [/^dij/, /^dec/], [/^vin/, /^ven/], [/^traj/, /^tra/],
  [/^d(i|io|ieron)$/, /^dab/], [/^v(i|io|ieron)$/, /^ve/], [/^hubo$/, /^hab/], [/^anduv/, /^andab/], [/^conduj/, /^conduc/],
];

/**
 * Imperfect: -aba forms, irregulars, or -ía forms written with the accent
 * (unaccented -ia would also match familia, historia).
 */
export function isImperfect(w: string): boolean {
  const f = fold(w);
  const lower = w.toLowerCase();
  return IMPERFECT_IRREGULAR.has(f) || (f.length > 4 && /(aba|abas|abamos|aban)$/.test(f)) || (lower.length > 3 && /(ía|ías|íamos|ían)$/.test(lower));
}

/**
 * Preterite: irregulars, -aron/-ieron, or -é/-ó/-í/-ió written with the
 * accent. Unaccented -o/-e are left out (hablo is present), and so are
 * -amos/-imos (also present) and -aste/-iste (triste).
 */
export function isPreterite(w: string): boolean {
  const f = fold(w);
  const lower = w.toLowerCase();
  return PRETERITE_IRREGULAR.has(f) || (f.length > 5 && /(aron|ieron)$/.test(f)) || (lower.length > 3 && /(é|ó|í|ió)$/.test(lower));
}

/** The two words are the same verb, one preterite and one imperfect. */
export function aspectSwap(from: string, to: string): boolean {
  if (fold(from) === fold(to)) return false;
  const pair = (pret: string, imp: string) => {
    const p = fold(pret);
    const i = fold(imp);
    return (
      isPreterite(pret) &&
      isImperfect(imp) &&
      (commonPrefix(p, i) >= 3 || IRREGULAR_PAIRS.some(([pr, im]) => pr.test(p) && im.test(i)))
    );
  };
  return pair(from, to) || pair(to, from);
}

function commonPrefix(a: string, b: string): number {
  let k = 0;
  while (k < a.length && k < b.length && a[k] === b[k]) k++;
  return k;
}

export type Finding =
  | { kind: "por_para"; from: string; to: string }
  | { kind: "aspect"; from: string; to: string };

/** What the instructor changed in the two target clusters, if anything. */
export function targetChanges(ops: Op[]): { findings: Finding[]; unreadable: boolean } {
  const findings: Finding[] = [];
  let unreadable = false;
  for (const op of ops) {
    if (op.kind !== "change") continue;
    // Two words run together in the correction ("tuvoTenía"): can't be read.
    if (op.corrected.some((w) => /\p{Ll}\p{Lu}/u.test(w))) {
      unreadable = true;
      continue;
    }
    const l = op.learner.map(fold);
    const c = op.corrected.map(fold);
    const ppL = l.filter((w) => POR_PARA.has(w));
    const ppC = c.filter((w) => POR_PARA.has(w));
    if (ppL.length || ppC.length) {
      // Only a one-word por <-> para swap is read as an error. A por/para the
      // instructor dropped or replaced with another preposition is often a
      // matter of style, so the sentence is not used either way.
      if (l.length === 1 && c.length === 1 && ppL.length === 1 && ppC.length === 1) findings.push({ kind: "por_para", from: op.learner[0], to: op.corrected[0] });
      else unreadable = true;
    }
    if (op.learner.length === 1 && op.corrected.length === 1 && aspectSwap(op.learner[0], op.corrected[0])) {
      findings.push({ kind: "aspect", from: op.learner[0], to: op.corrected[0] });
    } else if (op.learner.some((w) => op.corrected.some((v) => aspectSwap(w, v)))) {
      // An aspect change inside a rewritten phrase: don't use the sentence either way.
      unreadable = true;
    }
  }
  return { findings, unreadable };
}

/**
 * Forms that are surely por/para, preterite or imperfect: por/para,
 * irregulars, -aba, -aron/-ieron, accented -ó/-ió. Stricter than
 * isPreterite/isImperfect, which an aspect swap pairs with a second form;
 * alone, -é, -í and -ía also match nouns and adverbs (cliché, aquí, mayoría).
 */
function surelyTarget(w: string): boolean {
  const f = fold(w);
  const lower = w.toLowerCase();
  return (
    POR_PARA.has(f) ||
    PRETERITE_IRREGULAR.has(f) ||
    IMPERFECT_IRREGULAR.has(f) ||
    (f.length > 4 && /(aba|abas|abamos|aban)$/.test(f)) ||
    (f.length > 5 && /(aron|ieron)$/.test(f)) ||
    (lower.length > 3 && /(ó|ió)$/.test(lower))
  );
}

/** Target forms the sentence contains and the instructor left unchanged. */
export function untouchedTargets(ops: Op[]): string[] {
  return ops
    .filter((op) => op.kind === "equal")
    .flatMap((op) => op.learner)
    .filter(surelyTarget);
}

/** Sentences, keeping their punctuation. */
export function sentences(text: string): string[] {
  return (text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

/** Minimal RFC 4180 CSV reader (quoted fields may hold commas and newlines). */
export function readCsv(file: string): Record<string, string>[] {
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
