import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const allEvents = await db
      .select()
      .from(events)
      .orderBy(desc(events.occurredAt))
      .limit(50);

    const totalCountRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(events);
    const totalEvents = Number(totalCountRes[0]?.count || 0);

    let explorationCount = 0;
    let missingCausalFieldsCount = 0;
    const actionCounts: Record<string, number> = {};
    const explorationTypeCounts: Record<string, number> = {};

    for (const ev of allEvents) {
      if (ev.isExploration) {
        explorationCount++;
        if (ev.explorationType) {
          explorationTypeCounts[ev.explorationType] =
            (explorationTypeCounts[ev.explorationType] || 0) + 1;
        }
      }

      actionCounts[ev.policyAction] = (actionCounts[ev.policyAction] || 0) + 1;

      if (!ev.policyCandidates || ev.propensity === null || ev.isExploration === null) {
        missingCausalFieldsCount++;
      }
    }

    const explorationRate =
      allEvents.length > 0 ? (explorationCount / allEvents.length) * 100 : 0;

    return NextResponse.json({
      success: true,
      audit: {
        totalEvents,
        sampleChecked: allEvents.length,
        explorationRate: Number(explorationRate.toFixed(1)),
        missingCausalFieldsCount,
        actionDistribution: actionCounts,
        explorationTypeBreakdown: explorationTypeCounts,
        recentCausalEvents: allEvents.slice(0, 15).map((e) => ({
          eventId: e.eventId,
          occurredAt: e.occurredAt,
          policyAction: e.policyAction,
          policyCandidates: e.policyCandidates,
          propensity: e.propensity,
          isExploration: e.isExploration,
          explorationType: e.explorationType,
          cohort: e.cohort,
        })),
      },
    });
  } catch (error: any) {
    console.error("Policy audit error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
