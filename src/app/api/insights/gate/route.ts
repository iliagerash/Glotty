import { NextRequest, NextResponse } from "next/server";
import { checkInsightGate, formatSurfacedInsight, CandidateInsight } from "@/lib/insight/gate";
import { db } from "@/db";
import { insightFeedbacks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      diagnosisCode = "PP.01",
      conceptId = "es.sem.por_para",
      posteriorProbability = 0.88,
      observationCount = 4,
      distinctActivityTypes = 2,
      distinctSessions = 2,
      counterHypothesisProbed = true,
      minEvalConfidence = 0.85,
      forceCircuitBreaker = false,
      userId = "usr_b1_learner_default",
    } = body;

    // Check circuit breaker status from DB or override
    let circuitBreakerActive = forceCircuitBreaker;
    if (!circuitBreakerActive) {
      const allFeedback = await db
        .select()
        .from(insightFeedbacks)
        .where(eq(insightFeedbacks.userId, userId));
      const wrongCount = allFeedback.filter((f) => f.rating === "wrong").length;
      if (allFeedback.length >= 5 && wrongCount / allFeedback.length > 0.03) {
        circuitBreakerActive = true;
      }
    }

    // Synthesize observations according to parameters
    const observations = [];
    for (let i = 0; i < observationCount; i++) {
      const sessionNum = i < Math.floor(observationCount / distinctSessions) ? "s1" : "s2";
      const activity = i % distinctActivityTypes === 0 ? "conversation_turn" : "constrained_production";
      observations.push({
        eventId: `ev_${i + 1}`,
        sessionId: sessionNum,
        activityType: activity,
        evalConfidence: minEvalConfidence,
        occurredAt: new Date(Date.now() - (observationCount - i) * 86400000),
      });
    }

    const candidate: CandidateInsight = {
      diagnosisCode,
      conceptId,
      posteriorProbability,
      observations,
      counterHypothesisProbed,
      counterHypothesisCode: diagnosisCode.startsWith("PI") ? "PI.06" : "PP.06",
    };

    const gateResult = checkInsightGate(candidate, circuitBreakerActive);

    let phrasedInsight = null;
    if (gateResult.passesGate && (gateResult.register === "unhedged" || gateResult.register === "hedged")) {
      phrasedInsight = formatSurfacedInsight(
        diagnosisCode,
        conceptId,
        gateResult.register,
        posteriorProbability
      );
    }

    return NextResponse.json({
      success: true,
      gateResult,
      phrasedInsight,
      circuitBreakerActive,
    });
  } catch (error: any) {
    console.error("Insight gate test error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
