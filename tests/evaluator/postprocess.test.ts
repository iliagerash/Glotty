import { test } from "node:test";
import assert from "node:assert/strict";
import { postProcess, type ModelVerdict } from "../../src/lib/evaluator";

const codes = new Set(["PI.01", "PP.01", "UNKNOWN"]);
const verdict = (v: Partial<ModelVerdict>): ModelVerdict => ({
  analysis: "",
  evaluation: "incorrect",
  confidence: 0.9,
  concept_ids: ["es.gram.aspect.pret_imp"],
  error_span: "fui",
  correction: "iba",
  diagnosis_code: "PI.01",
  diagnosis_confidence: 0.8,
  clarifying_question: null,
  other_errors: [],
  ...v,
});

test("keeps a confident, known diagnosis", () => {
  const r = postProcess(verdict({}), codes);
  assert.equal(r.evaluation, "incorrect");
  assert.equal(r.diagnosisCode, "PI.01");
  assert.equal(r.adjustment, null);
});

test("turns a low-confidence incorrect into an abstention", () => {
  const r = postProcess(verdict({ confidence: 0.6 }), codes);
  assert.equal(r.evaluation, "uncertain");
  assert.equal(r.diagnosisCode, null);
  assert.equal(r.errorSpan, null);
  assert.match(r.adjustment!, /abstained/);
});

test("maps unknown or missing codes to UNKNOWN", () => {
  assert.equal(postProcess(verdict({ diagnosis_code: "PI.99" }), codes).diagnosisCode, "UNKNOWN");
  assert.equal(postProcess(verdict({ diagnosis_code: null }), codes).diagnosisCode, "UNKNOWN");
});

test("drops diagnosis fields on non-incorrect verdicts", () => {
  const r = postProcess(verdict({ evaluation: "correct", diagnosis_code: "PI.01" }), codes);
  assert.equal(r.diagnosisCode, null);
  assert.equal(r.correction, null);
});

test("filters concept ids to the MVP clusters", () => {
  const r = postProcess(verdict({ concept_ids: ["es.sem.por_para.purpose", "es.gram.subjunctive"] }), codes);
  assert.deepEqual(r.conceptIds, ["es.sem.por_para.purpose"]);
});
