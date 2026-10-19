import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { insightFeedbacks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "usr_b1_learner_default";

    const allFeedbacks = await db
      .select()
      .from(insightFeedbacks)
      .where(eq(insightFeedbacks.userId, userId));

    const total = allFeedbacks.length;
    const usefulCount = allFeedbacks.filter((f) => f.rating === "useful").length;
    const notUsefulCount = allFeedbacks.filter((f) => f.rating === "not_useful").length;
    const wrongCount = allFeedbacks.filter((f) => f.rating === "wrong").length;

    const usefulRate = total > 0 ? (usefulCount / total) * 100 : 0;
    const wrongRate = total > 0 ? (wrongCount / total) * 100 : 0;

    // Hard ceiling: wrong rate <= 3% (§11)
    const circuitBreakerBreached = total >= 5 && wrongRate > 3.0;

    return NextResponse.json({
      success: true,
      totalFeedbacks: total,
      usefulCount,
      usefulRate: Number(usefulRate.toFixed(1)),
      notUsefulCount,
      wrongCount,
      wrongRate: Number(wrongRate.toFixed(1)),
      circuitBreakerBreached,
      feedbacks: allFeedbacks.slice(-20).reverse(),
    });
  } catch (error: any) {
    console.error("Error fetching insight metrics:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
