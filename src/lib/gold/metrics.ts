import type { Evaluation } from "@/lib/evaluator";

/**
 * Pure metric functions for the evaluator acceptance gates (§25) and
 * inter-annotator agreement (§24). No I/O, so they are easy to test.
 */

export interface Label {
  evaluation: Evaluation;
  diagnosis_code: string | null;
}

export type GoldStatus = "single" | "agreed" | "adjudicated" | "disagreed" | "unlabeled";

/**
 * Resolves the gold label for one item from its annotations.
 * Disagreements without an adjudication have no gold label and are left
 * out of evaluator metrics: they are a rubric problem, not an evaluator one.
 */
export function resolveGold(
  labels: Label[],
  adjudication?: Label,
): { label: Label | null; status: GoldStatus } {
  if (adjudication) return { label: adjudication, status: "adjudicated" };
  if (labels.length === 0) return { label: null, status: "unlabeled" };
  if (labels.length === 1) return { label: labels[0], status: "single" };
  const [first, ...rest] = labels;
  const agree = rest.every(
    (l) => l.evaluation === first.evaluation && l.diagnosis_code === first.diagnosis_code,
  );
  return agree ? { label: first, status: "agreed" } : { label: null, status: "disagreed" };
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

  const diag = ok.filter(
    (r) => r.gold.evaluation === "incorrect" && r.pred.evaluation === "incorrect",
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
