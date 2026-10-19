import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { insightFeedbacks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sessionId,
      userId = "usr_b1_learner_default",
      diagnosisCode,
      rating,
      notes,
    } = body;

    if (!diagnosisCode || !rating) {
      return NextResponse.json(
        { success: false, error: "Missing diagnosisCode or rating" },
        { status: 400 }
      );
    }

    await db.insert(insightFeedbacks).values({
      sessionId: sessionId || null,
      userId,
      diagnosisCode,
      rating, // 'useful' | 'not_useful' | 'wrong'
      notes: notes || null,
    });

    // Check wrong-insight rate against the <= 3% budget (§11)
    const allFeedback = await db
      .select()
      .from(insightFeedbacks)
      .where(eq(insightFeedbacks.userId, userId));
    const wrongCount = allFeedback.filter((f) => f.rating === "wrong").length;
    const wrongRate = allFeedback.length > 0 ? wrongCount / allFeedback.length : 0;
    const circuitBreakerBreached = allFeedback.length >= 5 && wrongRate > 0.03;

    return NextResponse.json({
      success: true,
      loggedRating: rating,
      totalFeedbacks: allFeedback.length,
      wrongRate: Number((wrongRate * 100).toFixed(1)),
      circuitBreakerBreached,
    });
  } catch (error: any) {
    console.error("Error logging insight feedback:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
