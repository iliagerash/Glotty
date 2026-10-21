import { fold, isWord, type Token } from "@/lib/gold/morph";

/** A run of aligned words: unchanged, or changed by the corrector. */
export type Op = { kind: "equal" | "change"; learner: Token[]; corrected: Token[] };

type Step = { kind: Op["kind"]; i?: number; j?: number };

/** Word-level alignment path (LCS on accent- and case-folded words). */
function alignPath(a: string[], b: string[]): Step[] {
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

/**
 * Aligns a learner text with its correction, word by word (punctuation is
 * ignored), and splits the alignment by learner sentence, so a correction that
 * moves words between sentences still lands on the right one. Inserted words
 * go to the sentence of the learner word before them. Returns one list of
 * operations per learner sentence number.
 */
export function alignBySentence(learner: Token[], corrected: Token[]): Op[][] {
  const a = learner.filter(isWord);
  const b = corrected.filter(isWord);
  const sentences = Math.max(-1, ...learner.map((t) => t.sent)) + 1;
  const ops: Op[][] = Array.from({ length: sentences }, () => []);
  let current = 0;
  for (const step of alignPath(a.map((t) => fold(t.text)), b.map((t) => fold(t.text)))) {
    if (step.i !== undefined) current = a[step.i].sent;
    const list = ops[current];
    if (!list) continue;
    let last = list[list.length - 1];
    if (last?.kind !== step.kind) list.push((last = { kind: step.kind, learner: [], corrected: [] }));
    if (step.i !== undefined) last.learner.push(a[step.i]);
    if (step.j !== undefined) last.corrected.push(b[step.j]);
  }
  return ops;
}
