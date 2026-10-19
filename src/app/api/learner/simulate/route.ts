import { NextRequest, NextResponse } from "next/server";
import {
  createInitialConceptState,
  updateConceptState,
  getEvidenceWeight,
} from "@/lib/learner/state";
import { updateDSR } from "@/lib/learner/fsrs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      conceptId = "es.gram.aspect.pret_imp",
      activityType = "conversation_turn",
      exposureContext = "conversation",
      evalConfidence = 0.9,
      evaluation = "incorrect",
      diagnosisCode = "PI.01",
      currentState = null,
    } = body;

    const baseState = currentState ? JSON.parse(JSON.stringify(currentState)) : createInitialConceptState(conceptId);

    const weight = getEvidenceWeight(activityType, exposureContext, evalConfidence);

    const updatedState = updateConceptState(
      baseState,
      evaluation,
      activityType,
      exposureContext,
      evalConfidence,
      diagnosisCode,
      new Date()
    );

    // Calculate FSRS update
    const fsrsResult = updateDSR(null, evaluation, new Date(), 1.0);

    return NextResponse.json({
      success: true,
      evidenceWeight: weight,
      weightRationale: getWeightRationale(activityType, exposureContext, evalConfidence),
      updatedState,
      fsrs: fsrsResult,
    });
  } catch (error: any) {
    console.error("Simulation error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

function getWeightRationale(activity: string, exposure: string, conf: number): string {
  if (conf < 0.5) return "Uncertain evaluation (weight: 0.1) — near-zero influence on learner model.";
  if (exposure === "conversation" || activity === "conversation_turn")
    return "Free conversation (weight: 0.4) — deliberately down-weighted to prevent real-time slips from underestimating competence (§16).";
  if (activity === "reading")
    return "Reading comprehension (weight: 0.6) — confounded with world knowledge.";
  if (activity === "constrained_production")
    return "Constrained production (weight: 0.8) — intent mostly recoverable.";
  if (activity === "diagnostic_item" || exposure === "drill")
    return "Controlled diagnostic item with high confidence (weight: 1.0) — cleanest pedagogical signal.";
  return "Standard weighting (0.7).";
}
