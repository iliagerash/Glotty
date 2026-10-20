import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cohensKappa,
  evaluatorGates,
  evaluatorMetrics,
  percentile,
  combineJudges,
  combineRuns,
  resolveConsensus,
  resolveGold,
  type Label,
} from "../../src/lib/gold/metrics";

const L = (evaluation: Label["evaluation"], diagnosis_code: string | null = null): Label => ({ evaluation, diagnosis_code });

test("resolveGold: single, agreed, disagreed, adjudicated", () => {
  assert.equal(resolveGold([]).status, "unlabeled");
  assert.equal(resolveGold([L("correct")]).status, "single");
  assert.equal(resolveGold([L("incorrect", "PI.01"), L("incorrect", "PI.01")]).status, "agreed");
  const d = resolveGold([L("incorrect", "PI.01"), L("incorrect", "PI.06")]);
  assert.equal(d.status, "disagreed");
  assert.equal(d.label, null);
  assert.equal(resolveGold([L("correct"), L("incorrect", "PI.01")], L("correct")).status, "adjudicated");
  const c = resolveGold([L("correct"), L("incorrect", "PI.01")], { ...L("uncertain"), contested: true });
  assert.equal(c.status, "contested");
  assert.equal(c.label, null);
});

test("resolveConsensus: agreement is gold, disagreement waits for adjudication", () => {
  assert.equal(resolveConsensus(L("correct"), L("correct")).status, "agreed");
  assert.equal(resolveConsensus(L("incorrect", "PI.04"), L("incorrect", "PI.04")).status, "agreed");
  // Same verdict, different code: the diagnosis is disputed.
  const code = resolveConsensus(L("incorrect", "PI.03"), L("incorrect", "PI.04"));
  assert.equal(code.status, "disputed");
  assert.equal(code.label, null);
  assert.equal(resolveConsensus(L("correct"), L("incorrect", "PP.05")).status, "disputed");
  const adj = resolveConsensus(L("correct"), L("incorrect", "PP.05"), L("incorrect", "PP.05"));
  assert.deepEqual([adj.status, adj.label?.diagnosis_code], ["adjudicated", "PP.05"]);
  assert.equal(resolveConsensus(L("correct"), L("incorrect", "PP.05"), { ...L("uncertain"), contested: true }).status, "contested");
  assert.equal(resolveConsensus(null, L("correct")).status, "unlabeled");
  assert.equal(resolveConsensus(L("correct"), undefined).status, "unlabeled");
});

test("evaluatorMetrics counts false accusations against precision", () => {
  const m = evaluatorMetrics([
    { gold: L("incorrect", "PI.01"), pred: L("incorrect", "PI.01") },
    { gold: L("incorrect", "PI.01"), pred: L("incorrect", "PI.06") },
    { gold: L("correct"), pred: L("incorrect", "PI.01") }, // false accusation
    { gold: L("uncertain"), pred: L("incorrect", "PP.01") }, // also a false accusation
    { gold: L("correct"), pred: L("correct") },
    { gold: L("correct"), pred: L("uncertain") },
    { gold: L("not_applicable"), pred: L("not_applicable") },
    { gold: L("correct"), pred: L("not_applicable") }, // a miss, not an abstention
    { gold: L("correct"), pred: null }, // API failure
  ]);
  assert.equal(m.n, 9);
  assert.equal(m.failures, 1);
  assert.equal(m.precisionIncorrect, 2 / 4);
  assert.equal(m.falseAccusations, 2);
  assert.equal(m.recallIncorrect, 1);
  assert.equal(m.diagnosisTop1, 1 / 2);
  assert.equal(m.binaryN, 5);
  assert.equal(m.binaryAccuracy, 3 / 5);
  assert.equal(m.wrongNotApplicable, 1);
  assert.equal(m.uncertainRate, 1 / 7);
});

test("gates report null when there is no data", () => {
  const gates = evaluatorGates(evaluatorMetrics([]));
  assert.ok(gates.every((g) => g.pass === null));
});

test("cohensKappa", () => {
  assert.equal(cohensKappa(["a", "b", "a", "b"], ["a", "b", "a", "b"]), 1);
  assert.equal(cohensKappa([], []), null);
  // Classic example: po = 0.7, pe = 0.5 -> kappa 0.4
  const A = ["y", "y", "y", "y", "y", "n", "n", "n", "n", "n"];
  const B = ["y", "y", "y", "y", "n", "n", "n", "n", "y", "y"];
  assert.ok(Math.abs(cohensKappa(A, B)! - 0.4) < 1e-9);
});

test("percentile", () => {
  assert.equal(percentile([5, 1, 3, 2, 4], 50), 3);
  assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95), 10);
  assert.equal(percentile([], 50), null);
});

test("combineRuns: agreement keeps the label, a split becomes uncertain", () => {
  assert.deepEqual(combineRuns([L("incorrect", "PP.05"), L("incorrect", "PP.05")]), {
    label: L("incorrect", "PP.05"),
    split: false,
  });
  assert.deepEqual(combineRuns([L("correct"), L("incorrect", "PP.05")]), { label: L("uncertain"), split: true });
  // Same verdict, different code: the diagnosis is not settled either.
  assert.equal(combineRuns([L("incorrect", "PI.03"), L("incorrect", "PI.08")]).split, true);
  assert.equal(combineRuns([L("correct")]).split, false);
  assert.throws(() => combineRuns([]));
});

test("combineJudges: a split on the code alone stays incorrect, with no code", () => {
  assert.deepEqual(combineJudges([L("incorrect", "PI.03"), L("incorrect", "PI.08")]), {
    label: L("incorrect"),
    split: false,
    codeSplit: true,
  });
  assert.deepEqual(combineJudges([L("incorrect", "PI.03"), L("incorrect", "PI.03")]).label, L("incorrect", "PI.03"));
  assert.deepEqual(combineJudges([L("correct"), L("incorrect", "PI.03")]), { label: L("uncertain"), split: true, codeSplit: false });
});

test("evaluatorMetrics leaves gold incorrect with no code out of diagnosis, not out of precision", () => {
  const m = evaluatorMetrics([
    { gold: L("incorrect"), pred: L("incorrect", "PI.03") },
    { gold: L("incorrect", "PI.01"), pred: L("incorrect", "PI.01") },
  ]);
  assert.equal(m.precisionIncorrect, 1);
  assert.equal(m.diagnosisN, 1);
  assert.equal(m.diagnosisTop1, 1);
});
