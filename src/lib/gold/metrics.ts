import type { Evaluation } from "@/lib/evaluator";

/**
 * Pure metric functions for the evaluator acceptance gates (§25) and
 * inter-annotator agreement (§24). No I/O, so they are easy to test.
 */

export interface Label {
  evaluation: Evaluation;
  diagnosis_code: string | null;
}

/** An adjudicator's decision. `contested` means no rule settles the item: it has no gold label. */
export interface Adjudication extends Label {
  contested?: boolean;
}

export type GoldStatus = "single" | "agreed" | "adjudicated" | "disagreed" | "contested" | "unlabeled";

/**
 * Resolves the gold label for one item from its annotations.
 * Disagreements without an adjudication have no gold label and are left
 * out of evaluator metrics: they are a rubric problem, not an evaluator one.
 */
export function resolveGold(
  labels: Label[],
  adjudication?: Adjudication,
): { label: Label | null; status: GoldStatus } {
  if (adjudication?.contested) return { label: null, status: "contested" };
  if (adjudication) return { label: adjudication, status: "adjudicated" };
  if (labels.length === 0) return { label: null, status: "unlabeled" };
  if (labels.length === 1) return { label: labels[0], status: "single" };
  const [first, ...rest] = labels;
  const agree = rest.every(
    (l) => l.evaluation === first.evaluation && l.diagnosis_code === first.diagnosis_code,
  );
  return agree ? { label: first, status: "agreed" } : { label: null, status: "disagreed" };
}

/** Same evaluation, and the same code when both say incorrect. */
export function sameLabel(a: Label, b: Label): boolean {
  return a.evaluation === b.evaluation && (a.evaluation !== "incorrect" || a.diagnosis_code === b.diagnosis_code);
}

/**
 * Combines repeated labelling runs of one item by the same model judge.
 * Runs that agree give that label. Runs that split mean a careful reader can
 * go either way, so the item becomes "uncertain": the evaluator should then
 * abstain rather than decide, and an "incorrect" verdict counts as a false
 * accusation.
 */
export function combineRuns<L extends Label>(runs: L[]): { label: Label; split: boolean } {
  if (!runs.length) throw new Error("combineRuns needs at least one run");
  const [first, ...rest] = runs;
  if (rest.every((r) => sameLabel(first, r))) {
    return { label: { evaluation: first.evaluation, diagnosis_code: first.diagnosis_code }, split: false };
  }
  return { label: { evaluation: "uncertain", diagnosis_code: null }, split: true };
}

/**
 * Combines the two governance judges' labels. Like combineRuns, except that
 * when both say incorrect and only the code differs, the item stays incorrect
 * with no code: they agree it is an error. It counts for the evaluation
 * gates and is left out of diagnosis scoring.
 */
export function combineJudges(pair: [Label, Label]): { label: Label; split: boolean; codeSplit: boolean } {
  const [a, b] = pair;
  if (a.evaluation === "incorrect" && b.evaluation === "incorrect" && a.diagnosis_code !== b.diagnosis_code) {
    return { label: { evaluation: "incorrect", diagnosis_code: null }, split: false, codeSplit: true };
  }
  return { ...combineRuns(pair), codeSplit: false };
}

export type ConsensusStatus = "agreed" | "adjudicated" | "disputed" | "contested" | "unlabeled";

/**
 * Gold from a human label checked against an independent model label set,
 * for use while only one human annotator is available. Agreement makes the
 * label gold; a disagreement needs an adjudication, and stays out of gold
 * until it has one. An adjudication always wins.
 */
export function resolveConsensus(
  human: Label | null,
  model: Label | undefined,
  adjudication?: Adjudication,
): { label: Label | null; status: ConsensusStatus } {
  if (adjudication?.contested) return { label: null, status: "contested" };
  if (adjudication) return { label: adjudication, status: "adjudicated" };
  if (!human || !model) return { label: null, status: "unlabeled" };
  return sameLabel(human, model) ? { label: human, status: "agreed" } : { label: null, status: "disputed" };
}

export interface ScoredRow {
  gold: Label;
  /** null when the evaluator call failed. */
  pred: Label | null;
}

export interface EvaluatorMetrics {
  n: number;
  failures: number;
  /** Items where gold says the response exercises a target cluster. */
  applicable: number;
  binaryAccuracy: number | null;
  binaryN: number;
  precisionIncorrect: number | null;
  recallIncorrect: number | null;
  predictedIncorrect: number;
  falseAccusations: number;
  /** Predicted "not_applicable" where gold says the response is applicable. */
  wrongNotApplicable: number;
  diagnosisTop1: number | null;
  diagnosisN: number;
  uncertainRate: number | null;
}

const ratio = (a: number, b: number) => (b === 0 ? null : a / b);

export function evaluatorMetrics(rows: ScoredRow[]): EvaluatorMetrics {
  const ok = rows.filter((r): r is { gold: Label; pred: Label } => r.pred !== null);
  const applicable = ok.filter((r) => r.gold.evaluation !== "not_applicable");

  const decided = (e: Evaluation) => e === "correct" || e === "incorrect";
  // A "not_applicable" verdict on a decided item is a miss, not an abstention:
  // otherwise a model could skip hard items and raise its accuracy.
  const binary = ok.filter(
    (r) =>
      decided(r.gold.evaluation) &&
      (decided(r.pred.evaluation) || r.pred.evaluation === "not_applicable"),
  );
  const binaryHits = binary.filter((r) => r.gold.evaluation === r.pred.evaluation).length;

  // Every predicted "incorrect" counts against precision unless gold agrees,
  // including gold "uncertain" and "not_applicable": all are false accusations.
  const predIncorrect = ok.filter((r) => r.pred.evaluation === "incorrect");
  const truePositives = predIncorrect.filter((r) => r.gold.evaluation === "incorrect").length;
  const goldIncorrect = ok.filter((r) => r.gold.evaluation === "incorrect").length;

  // Gold "incorrect" with no code (the judges split on the code) is left out.
  const diag = ok.filter(
    (r) => r.gold.evaluation === "incorrect" && r.gold.diagnosis_code !== null && r.pred.evaluation === "incorrect",
  );
  const diagHits = diag.filter((r) => r.gold.diagnosis_code === r.pred.diagnosis_code).length;

  return {
    n: rows.length,
    failures: rows.length - ok.length,
    applicable: applicable.length,
    binaryAccuracy: ratio(binaryHits, binary.length),
    binaryN: binary.length,
    precisionIncorrect: ratio(truePositives, predIncorrect.length),
    recallIncorrect: ratio(truePositives, goldIncorrect),
    predictedIncorrect: predIncorrect.length,
    falseAccusations: predIncorrect.length - truePositives,
    wrongNotApplicable: applicable.filter((r) => r.pred.evaluation === "not_applicable").length,
    diagnosisTop1: ratio(diagHits, diag.length),
    diagnosisN: diag.length,
    uncertainRate: ratio(
      applicable.filter((r) => r.pred.evaluation === "uncertain").length,
      applicable.length,
    ),
  };
}

export interface GateResult {
  metric: string;
  value: number | null;
  threshold: string;
  pass: boolean | null;
}

/** §25 gates. `pass` is null when there is not enough data to decide. */
export function evaluatorGates(m: EvaluatorMetrics): GateResult[] {
  const gate = (metric: string, value: number | null, threshold: string, ok: (v: number) => boolean) => ({
    metric,
    value,
    threshold,
    pass: value === null ? null : ok(value),
  });
  return [
    gate("Binary accuracy", m.binaryAccuracy, "≥ 0.90", (v) => v >= 0.9),
    gate("Precision on INCORRECT", m.precisionIncorrect, "≥ 0.95", (v) => v >= 0.95),
    gate("Diagnosis top-1 given INCORRECT", m.diagnosisTop1, "≥ 0.65", (v) => v >= 0.65),
    gate("UNCERTAIN rate", m.uncertainRate, "≤ 0.15", (v) => v <= 0.15),
  ];
}

/** Cohen's kappa for two annotators over the same items. */
export function cohensKappa(a: string[], b: string[]): number | null {
  if (a.length !== b.length) throw new Error("Label lists must be the same length");
  const n = a.length;
  if (n === 0) return null;
  const categories = new Set([...a, ...b]);
  let observed = 0;
  for (let i = 0; i < n; i++) if (a[i] === b[i]) observed++;
  const po = observed / n;
  let pe = 0;
  for (const c of categories) {
    const pa = a.filter((x) => x === c).length / n;
    const pb = b.filter((x) => x === c).length / n;
    pe += pa * pb;
  }
  if (pe === 1) return 1;
  return (po - pe) / (1 - pe);
}

export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((x, y) => x - y);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}
