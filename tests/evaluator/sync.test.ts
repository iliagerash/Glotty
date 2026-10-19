import assert from "assert";
import { evaluateSync, normalizeText } from "../../src/lib/evaluator/sync";

function testSyncEvaluator() {
  console.log("Testing synchronous evaluator...");

  assert.strictEqual(normalizeText("  ¿Por  qué, Ana?  "), "por qué ana");
  console.log("✓ Normalization strips punctuation and collapses whitespace");

  const answerKey = {
    accepted: ["Lo hice por ti."],
    rejected: [{ form: "Lo hice para ti.", diagnosisCode: "PP.01" }],
  };
  assert.strictEqual(evaluateSync("lo hice por ti", "es.sem.por_para", answerKey).evaluation, "correct");
  const rejected = evaluateSync("Lo hice para ti", "es.sem.por_para", answerKey);
  assert.strictEqual(rejected.evaluation, "incorrect");
  assert.strictEqual(rejected.diagnosisCode, "PP.01");
  console.log("✓ Answer key accepts and rejects normalized forms");

  const fixed = evaluateSync("Muchas gracias para todo", "es.sem.por_para");
  assert.strictEqual(fixed.evaluation, "incorrect");
  assert.strictEqual(fixed.diagnosisCode, "PP.07");
  assert.strictEqual(evaluateSync("Muchas gracias por todo", "es.sem.por_para").evaluation, "correct");
  console.log("✓ Fixed expressions (PP.07) are caught");

  const free = evaluateSync("Cuando era niño jugaba al fútbol", "es.gram.aspect.pret_imp");
  assert.strictEqual(free.evaluation, "uncertain");
  assert.strictEqual(free.evalPath, "sync");
  console.log("✓ Free-form production abstains to UNCERTAIN for the async path");

  console.log("All sync evaluator tests passed.");
}

testSyncEvaluator();
