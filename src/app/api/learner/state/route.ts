import { NextRequest, NextResponse } from "next/server";
import { reconstructLearnerState } from "@/lib/learner/replay";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "usr_b1_learner_default";

    const profile = await reconstructLearnerState(userId);

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error: any) {
    console.error("Error fetching learner state:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
