import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { learningSessions, events } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "usr_b1_learner_default";

    const sessions = await db
      .select()
      .from(learningSessions)
      .where(eq(learningSessions.userId, userId))
      .orderBy(desc(learningSessions.startedAt));

    const enrichedSessions = [];
    for (const s of sessions) {
      const sessionEvents = await db
        .select()
        .from(events)
        .where(eq(events.sessionId, s.id));

      enrichedSessions.push({
        id: s.id,
        sessionNumber: s.sessionNumber,
        status: s.status,
        goal: s.goal,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        summary: s.summary,
        surfacedInsights: s.surfacedInsights || [],
        eventCount: sessionEvents.length,
        evaluations: {
          correct: sessionEvents.filter((e) => e.evaluation === "correct").length,
          incorrect: sessionEvents.filter((e) => e.evaluation === "incorrect").length,
          uncertain: sessionEvents.filter((e) => e.evaluation === "uncertain").length,
        },
      });
    }

    return NextResponse.json({
      success: true,
      sessions: enrichedSessions,
    });
  } catch (error: any) {
    console.error("Error fetching session history:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
