import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { evaluateSync } from "@/lib/evaluator/sync";
import { evaluateAsync } from "@/lib/evaluator/gemini_async";
import { computeGateMetrics, EvaluatedItem } from "@/lib/evaluator/gate_check";

export async function GET(req: NextRequest) {
  try {
    const goldPath = path.join(process.cwd(), "data", "gold_set", "spanish_b1_gold.json");
    const goldItems = JSON.parse(fs.readFileSync(goldPath, "utf-8"));

    // Measure sync path latency
    const syncLatencies: number[] = [];
    for (let i = 0; i < 50; i++) {
      const t0 = performance.now();
      evaluateSync("muchas gracias por todo", "es.sem.por_para");
      syncLatencies.push(performance.now() - t0);
    }

    const evaluatedItems: EvaluatedItem[] = [];
    const itemDetails: any[] = [];

    for (const item of goldItems) {
      const res = await evaluateAsync(item.prompt, item.response, item.concept_id);
      evaluatedItems.push({
        id: item.id,
        expectedEvaluation: item.expected_evaluation,
        expectedDiagnosis: item.expected_diagnosis,
        actualEvaluation: res.evaluation,
        actualDiagnosis: res.diagnosisCode,
      });

      itemDetails.push({
        id: item.id,
        prompt: item.prompt,
        response: item.response,
        conceptId: item.concept_id,
        expectedEvaluation: item.expected_evaluation,
        expectedDiagnosis: item.expected_diagnosis,
        actualEvaluation: res.evaluation,
        actualDiagnosis: res.diagnosisCode,
        evalConfidence: res.evalConfidence,
        rationale: res.rationale,
        notes: item.notes,
        passed:
          res.evaluation === item.expected_evaluation &&
          res.diagnosisCode === item.expected_diagnosis,
      });
    }

    const metrics = computeGateMetrics(evaluatedItems, syncLatencies);

    return NextResponse.json({
      success: true,
      metrics,
      items: itemDetails,
    });
  } catch (error: any) {
    console.error("Benchmark error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
