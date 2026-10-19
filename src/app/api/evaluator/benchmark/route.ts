import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { evaluateSync } from "@/lib/evaluator/sync";
import { evaluateAsync } from "@/lib/evaluator/async";
import { computeGateMetrics, EvaluatedItem } from "@/lib/evaluator/gate_check";
import { getEvaluatorProvider } from "@/lib/llm/gateway";

export async function GET(req: NextRequest) {
  try {
    const provider = getEvaluatorProvider();
    if (!provider) {
      return NextResponse.json(
        { success: false, error: "No evaluator model configured; benchmark not run." },
        { status: 503 }
      );
    }

    const split = req.nextUrl.searchParams.get("split") ?? "heldout";
    const goldPath = path.join(process.cwd(), "data", "gold_set", "spanish_b1_gold.json");
    const allItems = JSON.parse(fs.readFileSync(goldPath, "utf-8"));
    const goldItems = split === "all" ? allItems : allItems.filter((i: any) => i.split === split);

    // Measure sync path latency
    const syncLatencies: number[] = [];
    for (let i = 0; i < 50; i++) {
      const t0 = performance.now();
      evaluateSync("muchas gracias por todo", "es.sem.por_para");
      syncLatencies.push(performance.now() - t0);
    }

    const evaluatedItems: EvaluatedItem[] = [];
    const itemDetails: any[] = [];
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

    if (failures.length > 0) {
      return NextResponse.json(
        { success: false, error: "Evaluator calls failed; no metrics reported.", failures },
        { status: 502 }
      );
    }

    const metrics = computeGateMetrics(evaluatedItems, syncLatencies);

    return NextResponse.json({
      success: true,
      split,
      evaluator: `${provider.id}:${provider.model}`,
      synthetic: goldItems.some((i: any) => i.provenance === "synthetic_seed"),
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
