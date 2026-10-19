import assert from "assert";
import { evaluateAsync, INCORRECT_MIN_CONFIDENCE } from "../../src/lib/evaluator/async";
import type { ModelProvider } from "../../src/lib/llm/gateway";

function fakeProvider(output: unknown | (() => never)): ModelProvider {
  return {
    id: "fake",
    model: "fake-1",
    async completeJson() {
      if (typeof output === "function") return (output as () => never)();
      return output;
    },
  };
}

const PI = "es.gram.aspect.pret_imp";
const PP = "es.sem.por_para";

async function testAsyncEvaluator() {
  console.log("Testing async evaluator contract...");

  // No provider: unscored, never a fabricated label
  const unavailable = await evaluateAsync("p", "Cuando fui joven, jugué al fútbol.", PI, null);
  assert.strictEqual(unavailable.status, "unavailable");
  assert.strictEqual(unavailable.evaluation, "uncertain");
  assert.strictEqual(unavailable.evalConfidence, 0);
  assert.strictEqual(unavailable.diagnosisCode, null);
  console.log("✓ No provider returns UNCERTAIN with status 'unavailable'");

  // Provider failure: unscored with status 'error'
  const failed = await evaluateAsync(
    "p",
    "r",
    PI,
    fakeProvider(() => {
      throw new Error("model not found");
    })
  );
  assert.strictEqual(failed.status, "error");
  assert.strictEqual(failed.evaluation, "uncertain");
  assert.strictEqual(failed.evalConfidence, 0);
  assert.ok(failed.rationale.includes("model not found"));
  console.log("✓ Provider error returns UNCERTAIN with status 'error'");

  // Confident INCORRECT with a valid code passes through
  const ok = await evaluateAsync(
    "p",
    "r",
    PI,
    fakeProvider({ evaluation: "incorrect", eval_confidence: 0.9, diagnosis_code: "PI.01", diagnosis_confidence: 0.8, rationale: "x" })
  );
  assert.strictEqual(ok.status, "ok");
  assert.strictEqual(ok.evaluation, "incorrect");
  assert.strictEqual(ok.diagnosisCode, "PI.01");
  assert.strictEqual(ok.diagnosisConfidence, 0.8);
  assert.strictEqual(ok.evaluatorVersion, "async-fake:fake-1-diag-v2");
  console.log("✓ Confident INCORRECT with valid code is kept, version names the model");

  // Low-confidence INCORRECT abstains
  const low = await evaluateAsync(
    "p",
    "r",
    PI,
    fakeProvider({ evaluation: "incorrect", eval_confidence: INCORRECT_MIN_CONFIDENCE - 0.01, diagnosis_code: "PI.01" })
  );
  assert.strictEqual(low.evaluation, "uncertain");
  assert.strictEqual(low.diagnosisCode, null);
  console.log("✓ INCORRECT below the confidence floor abstains to UNCERTAIN");

  // Code from the other cluster is not accepted
  const crossCluster = await evaluateAsync(
    "p",
    "r",
    PI,
    fakeProvider({ evaluation: "incorrect", eval_confidence: 0.95, diagnosis_code: "PP.01", diagnosis_confidence: 0.9 })
  );
  assert.strictEqual(crossCluster.evaluation, "incorrect");
  assert.strictEqual(crossCluster.diagnosisCode, "UNKNOWN");
  assert.strictEqual(crossCluster.diagnosisConfidence, null);
  console.log("✓ Diagnosis code outside the concept's taxonomy becomes UNKNOWN");

  // Missing confidence is not defaulted upward
  const noConf = await evaluateAsync("p", "r", PP, fakeProvider({ evaluation: "incorrect", diagnosis_code: "PP.01" }));
  assert.strictEqual(noConf.evaluation, "uncertain");
  assert.strictEqual(noConf.evalConfidence, 0);
  console.log("✓ Missing confidence is treated as 0, not a high default");

  // Garbage label
  const garbage = await evaluateAsync("p", "r", PP, fakeProvider({ evaluation: "maybe", eval_confidence: 0.99 }));
  assert.strictEqual(garbage.evaluation, "uncertain");
  assert.strictEqual(garbage.evalConfidence, 0);
  console.log("✓ Unrecognized evaluation label becomes UNCERTAIN");

  // CORRECT drops any stray diagnosis; confidence is clamped
  const correct = await evaluateAsync(
    "p",
    "r",
    PP,
    fakeProvider({ evaluation: "correct", eval_confidence: 1.7, diagnosis_code: "PP.01", diagnosis_confidence: 0.9 })
  );
  assert.strictEqual(correct.evaluation, "correct");
  assert.strictEqual(correct.evalConfidence, 1);
  assert.strictEqual(correct.diagnosisCode, null);
  console.log("✓ CORRECT carries no diagnosis and confidence is clamped to [0, 1]");

  console.log("All async evaluator tests passed.");
}

testAsyncEvaluator().catch((err) => {
  console.error(err);
  process.exit(1);
});
