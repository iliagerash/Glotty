import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import {
  createInitialConceptState,
  updateConceptState,
  ConceptLearnerState,
} from "@/lib/learner/state";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "usr_b1_learner_default";

    const rawEvents = await db
      .select()
      .from(events)
      .where(eq(events.userId, userId))
      .orderBy(asc(events.occurredAt));

    const steps: Array<{
      stepIndex: number;
      eventId: string;
      occurredAt: Date;
      conceptIds: string[];
      activityType: string;
      rawResponse: string | null;
      evaluation: string;
      diagnosisCode: string | null;
      evidenceWeight: number;
      statesSnapshot: Record<string, ConceptLearnerState>;
    }> = [];

    const currentStates: Record<string, ConceptLearnerState> = {};

    let index = 1;
    for (const ev of rawEvents) {
      for (const conceptId of ev.conceptIds) {
        if (!currentStates[conceptId]) {
          currentStates[conceptId] = createInitialConceptState(conceptId);
        }

        updateConceptState(
          currentStates[conceptId],
          ev.evaluation as any,
          ev.activityType,
          ev.exposureContext,
          ev.evalConfidence || 0.8,
          ev.diagnosisCode || null,
          ev.occurredAt
        );
      }

      // Clone snapshot of states at this point in time
      const snapshot: Record<string, ConceptLearnerState> = JSON.parse(
        JSON.stringify(currentStates)
      );

      steps.push({
        stepIndex: index++,
        eventId: ev.eventId,
        occurredAt: ev.occurredAt,
        conceptIds: ev.conceptIds,
        activityType: ev.activityType,
        rawResponse: ev.rawResponse,
        evaluation: ev.evaluation,
        diagnosisCode: ev.diagnosisCode,
        evidenceWeight: ev.evidenceWeight,
        statesSnapshot: snapshot,
      });
    }

    return NextResponse.json({
      success: true,
      totalEvents: rawEvents.length,
      steps,
    });
  } catch (error: any) {
    console.error("Error generating replay steps:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
