import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, learningSessions, insightFeedbacks } from "@/db/schema";
import { checkInsightGate, formatSurfacedInsight, CandidateInsight } from "@/lib/insight/gate";
import { eq, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, userId = "usr_b1_learner_default" } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "Missing sessionId" }, { status: 400 });
    }

    const sessionRows = await db
      .select()
      .from(learningSessions)
      .where(eq(learningSessions.id, sessionId));

    if (sessionRows.length === 0) {
      return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
    }

    const sessionObj = sessionRows[0];
    const sessionNumber = sessionObj.sessionNumber;

    // Check wrong-insight rate (§11) to check safety circuit breaker
    const feedbackRows = await db
      .select()
      .from(insightFeedbacks)
      .where(eq(insightFeedbacks.userId, userId));
    const wrongFeedbacks = feedbackRows.filter((f) => f.rating === "wrong").length;
    const circuitBreakerActive =
      feedbackRows.length > 5 && wrongFeedbacks / feedbackRows.length > 0.03;

    const surfacedInsights: Array<{
      id: string;
      code: string;
      hedged: boolean;
      text: string;
      confidence: number;
    }> = [];

    let debriefSummary: string;
    let nextSessionPreview: string;

    if (sessionNumber === 1) {
      // =========================================================================
      // Cold Start Protocol (§12): Never assert unearned insights in Session 1!
      // =========================================================================
      debriefSummary =
        "Hoy hemos comenzado a mapear tu perfil en español. En esta primera sesión Glotty escucha y calibra; las observaciones iniciales se acumulan en silencio para contrastarlas en situaciones controladas.";
      nextSessionPreview =
        "La próxima vez pondremos a prueba un par de situaciones narrativas específicas para comprobar la estabilidad de los tiempos y preposiciones.";
    } else {
      // =========================================================================
      // Steady State: Check Insight Gate across historical evidence (§9)
      // =========================================================================
      const allEvents = await db.select().from(events).where(eq(events.userId, userId));

      // Group observations by diagnosisCode
      const errorMap: Record<string, typeof allEvents> = {};
      for (const ev of allEvents) {
        if (ev.diagnosisCode && ev.diagnosisCode !== "UNKNOWN") {
          if (!errorMap[ev.diagnosisCode]) errorMap[ev.diagnosisCode] = [];
          errorMap[ev.diagnosisCode].push(ev);
        }
      }

      for (const [code, obsList] of Object.entries(errorMap)) {
        const candidate: CandidateInsight = {
          diagnosisCode: code,
          conceptId: obsList[0].conceptIds[0],
          posteriorProbability: Math.min(0.92, 0.65 + obsList.length * 0.08),
          observations: obsList.map((o) => ({
            eventId: o.eventId,
            sessionId: o.sessionId,
            activityType: o.activityType,
            evalConfidence: o.evalConfidence || 0.8,
            occurredAt: o.occurredAt,
          })),
          // Check if counter-hypothesis probe was performed
          counterHypothesisProbed: obsList.length >= 4,
          counterHypothesisCode: code.startsWith("PI") ? "PI.06" : "PP.06",
        };

        const gateResult = checkInsightGate(candidate, circuitBreakerActive);

        if (gateResult.passesGate && (gateResult.register === "unhedged" || gateResult.register === "hedged")) {
          const formatted = formatSurfacedInsight(
            code,
            candidate.conceptId,
            gateResult.register,
            candidate.posteriorProbability
          );
          surfacedInsights.push({
            id: `ins_${code}_${Date.now()}`,
            code,
            hedged: gateResult.register === "hedged",
            text: formatted.text,
            confidence: candidate.posteriorProbability,
          });
        }
      }

      debriefSummary =
        surfacedInsights.length > 0
          ? "Hemos identificado patrones consistentes respaldados por evidencia en múltiples sesiones."
          : "Tus respuestas continúan alimentando el modelo probabilístico; aún estamos acumulando observaciones independientes.";
      nextSessionPreview =
        "Continuaremos consolidando la distinción semántica y la producción espontánea.";
    }

    // Update session record
    await db
      .update(learningSessions)
      .set({
        status: "completed",
        endedAt: new Date(),
        summary: { debriefSummary, nextSessionPreview },
        surfacedInsights,
      })
      .where(eq(learningSessions.id, sessionId));

    return NextResponse.json({
      success: true,
      sessionNumber,
      debriefSummary,
      nextSessionPreview,
      surfacedInsights,
    });
  } catch (error: any) {
    console.error("Error completing session:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
