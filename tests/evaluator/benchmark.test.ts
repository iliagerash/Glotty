import fs from "fs";
import path from "path";
import { evaluateSync } from "../../src/lib/evaluator/sync";
import { evaluateAsync } from "../../src/lib/evaluator/async";
import { computeGateMetrics, EvaluatedItem } from "../../src/lib/evaluator/gate_check";
import { getEvaluatorProvider } from "../../src/lib/llm/gateway";

/**
 * Evaluator benchmark (§25).
 *
 * Usage: npm run test:benchmark -- [--split=heldout|dev|all]
 *
 * Scores the real async evaluator through the model gateway. There is no
 * offline fallback: with no model configured, or if any call fails, the run
 * exits non-zero instead of reporting numbers.
 *
 * Gates are reported on the held-out split by default. Tune prompts on "dev"
 * only, so held-out numbers stay an honest estimate.
 */

type Split = "dev" | "heldout" | "all";

function parseSplit(): Split {
  const arg = process.argv.find((a) => a.startsWith("--split="));
  const value = arg ? arg.slice("--split=".length) : "heldout";
  if (value !== "dev" && value !== "heldout" && value !== "all") {
    throw new Error(`Invalid --split "${value}" (expected dev, heldout or all)`);
  }
  return value;
}

async function runBenchmark() {
  const split = parseSplit();

  console.log("=================================================");
  console.log(" GLOTTY EVALUATOR BENCHMARK");
  console.log("=================================================");

  const provider = getEvaluatorProvider();
  if (!provider) {
    console.error(
      "No evaluator model configured (set GEMINI_API_KEY, optionally GLOTTY_EVAL_MODEL).\n" +
        "Refusing to report benchmark numbers without a real evaluator."
    );
    process.exit(1);
  }
  console.log(`Evaluator: ${provider.id}:${provider.model}`);

  // 1. Synchronous path latency (<200ms gate)
  console.log("\n[1/3] Benchmarking synchronous path latency (100 iterations)...");
  const testSample = "muchas gracias por todo tu apoyo en este proyecto";
  const syncLatencies: number[] = [];
  for (let i = 0; i < 100; i++) {
    const t0 = performance.now();
    evaluateSync(testSample, "es.sem.por_para");
    syncLatencies.push(performance.now() - t0);
  }

  // 2. Gold items for the requested split
  console.log(`\n[2/3] Evaluating gold items (split: ${split})...`);
  const goldPath = path.join(process.cwd(), "data", "gold_set", "spanish_b1_gold.json");
  const allItems = JSON.parse(fs.readFileSync(goldPath, "utf-8"));
  const goldItems = split === "all" ? allItems : allItems.filter((i: any) => i.split === split);
  if (goldItems.length === 0) {
    throw new Error(`No gold items in split "${split}"`);
  }

  const synthetic = goldItems.filter((i: any) => i.provenance === "synthetic_seed").length;
  console.log(`Loaded ${goldItems.length} items (${synthetic} synthetic seed items).`);

  const evaluatedItems: EvaluatedItem[] = [];
  const failures: string[] = [];

  for (const item of goldItems) {
    const res = await evaluateAsync(item.prompt, item.response, item.concept_id, provider);
    if (res.status !== "ok") {
      failures.push(`${item.id}: ${res.rationale}`);
      continue;
    }
    evaluatedItems.push({
      id: item.id,
      expectedEvaluation: item.expected_evaluation,
      expectedDiagnosis: item.expected_diagnosis,
      actualEvaluation: res.evaluation,
      actualDiagnosis: res.diagnosisCode,
    });
    const match =
      res.evaluation === item.expected_evaluation && res.diagnosisCode === item.expected_diagnosis;
    if (!match) {
      console.log(
        `  MISS ${item.id}: expected ${item.expected_evaluation}/${item.expected_diagnosis}, ` +
          `got ${res.evaluation}/${res.diagnosisCode} (conf ${res.evalConfidence.toFixed(2)})`
      );
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} evaluator call(s) failed; no metrics reported:`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }

  // 3. Gates
  console.log("\n[3/3] Gate metrics (§25)...");
  const metrics = computeGateMetrics(evaluatedItems, syncLatencies);
  const flag = (passed: boolean) => (passed ? "PASS" : "FAIL");

  console.log("-------------------------------------------------");
  console.log(`Items scored:             ${metrics.totalItems}`);
  console.log(`Binary accuracy:          ${(metrics.binaryAccuracy * 100).toFixed(1)}%  (>= 90.0%) [${flag(metrics.gateDetails.binaryAccuracyPassed)}]`);
  console.log(`Precision on INCORRECT:   ${(metrics.precisionOnIncorrect * 100).toFixed(1)}%  (>= 95.0%) [${flag(metrics.gateDetails.precisionOnIncorrectPassed)}]`);
  console.log(`Diagnosis top-1 accuracy: ${(metrics.diagnosisTop1Accuracy * 100).toFixed(1)}%  (>= 65.0%) [${flag(metrics.gateDetails.diagnosisAccuracyPassed)}]`);
  console.log(`UNCERTAIN rate:           ${(metrics.uncertainRate * 100).toFixed(1)}%  (<= 15.0%) [${flag(metrics.gateDetails.uncertainRatePassed)}]`);
  console.log(`Sync path p95 latency:    ${metrics.syncLatencyP95Ms.toFixed(2)}ms (< 200ms)  [${flag(metrics.gateDetails.latencyPassed)}]`);
  console.log("-------------------------------------------------");

  if (synthetic > 0) {
    console.log(
      "NOTE: these items are synthetic seeds, not the annotated gold set of §24 " +
        "(400-600 real responses per cluster, two annotators, kappa gates).\n" +
        "Results are a smoke test and are NOT a Phase 1 acceptance result."
    );
  }

  if (!metrics.allGatesPassed) {
    console.error("Gate thresholds not met.");
    process.exit(1);
  }
  console.log("Gate thresholds met on this split.");
}

runBenchmark().catch((err) => {
  console.error("Error running benchmark:", err);
  process.exit(1);
});
