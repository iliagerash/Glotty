import fs from "fs";
import path from "path";
import { evaluateSync } from "../../src/lib/evaluator/sync";
import { evaluateAsync } from "../../src/lib/evaluator/gemini_async";
import { computeGateMetrics, EvaluatedItem } from "../../src/lib/evaluator/gate_check";

async function runBenchmark() {
  console.log("=================================================");
  console.log(" 🧪 GLOTTY EVALUATOR BENCHMARK & ACCEPTANCE GATES");
  console.log("=================================================");

  // 1. Measure Synchronous Path Latency (<200ms gate)
  console.log("\n[1/3] Benchmarking Synchronous Path Latency (100 iterations)...");
  const testSample = "muchas gracias por todo tu apoyo en este proyecto";
  const syncLatencies: number[] = [];
  for (let i = 0; i < 100; i++) {
    const t0 = performance.now();
    evaluateSync(testSample, "es.sem.por_para");
    syncLatencies.push(performance.now() - t0);
  }
  const sorted = [...syncLatencies].sort((a, b) => a - b);
  const p95Latency = sorted[Math.floor(sorted.length * 0.95)];
  console.log(`✓ Sync path p95 latency: ${p95Latency.toFixed(3)} ms (Gate: < 200ms)`);

  // 2. Load Gold Dataset
  console.log("\n[2/3] Evaluating on Gold Standard Dataset...");
  const goldPath = path.join(process.cwd(), "data", "gold_set", "spanish_b1_gold.json");
  const goldItems = JSON.parse(fs.readFileSync(goldPath, "utf-8"));
  console.log(`Loaded ${goldItems.length} curated gold items.`);

  const evaluatedItems: EvaluatedItem[] = [];

  for (const item of goldItems) {
    const res = await evaluateAsync(item.prompt, item.response, item.concept_id);
    evaluatedItems.push({
      id: item.id,
      expectedEvaluation: item.expected_evaluation,
      expectedDiagnosis: item.expected_diagnosis,
      actualEvaluation: res.evaluation,
      actualDiagnosis: res.diagnosisCode,
    });
  }

  // 3. Compute Acceptance Gates
  console.log("\n[3/3] Verifying Acceptance Gates against Specification §25...");
  const metrics = computeGateMetrics(evaluatedItems, syncLatencies);

  console.log("-------------------------------------------------");
  console.log(`Total Gold Items:            ${metrics.totalItems}`);
  console.log(`Binary Accuracy:             ${(metrics.binaryAccuracy * 100).toFixed(1)}%  (Gate: >= 90.0%) [${metrics.gateDetails.binaryAccuracyPassed ? "PASS" : "FAIL"}]`);
  console.log(`Precision on INCORRECT:      ${(metrics.precisionOnIncorrect * 100).toFixed(1)}% (Gate: >= 95.0%) [${metrics.gateDetails.precisionOnIncorrectPassed ? "PASS" : "FAIL"}]`);
  console.log(`Diagnosis Top-1 Accuracy:    ${(metrics.diagnosisTop1Accuracy * 100).toFixed(1)}% (Gate: >= 65.0%) [${metrics.gateDetails.diagnosisAccuracyPassed ? "PASS" : "FAIL"}]`);
  console.log(`UNCERTAIN Rate:              ${(metrics.uncertainRate * 100).toFixed(1)}%   (Gate: <= 15.0%) [${metrics.gateDetails.uncertainRatePassed ? "PASS" : "FAIL"}]`);
  console.log(`Sync Path p95 Latency:       ${metrics.syncLatencyP95Ms.toFixed(2)}ms (Gate: < 200ms)   [${metrics.gateDetails.latencyPassed ? "PASS" : "FAIL"}]`);
  console.log("-------------------------------------------------");

  if (!metrics.allGatesPassed) {
    console.error("❌ Evaluator Acceptance Gates FAILED. Review errors.");
    process.exit(1);
  } else {
    console.log("✅ ALL PHASE 1 EVALUATOR ACCEPTANCE GATES PASSED!");
    process.exit(0);
  }
}

runBenchmark().catch((err) => {
  console.error("Error running benchmark:", err);
  process.exit(1);
});
