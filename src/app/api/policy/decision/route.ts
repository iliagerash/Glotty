import { NextRequest, NextResponse } from "next/server";
import { selectPolicyAction } from "@/lib/policy/bandit";
import { applyExplorationGuardrails } from "@/lib/policy/exploration";
import { reconstructLearnerState } from "@/lib/learner/replay";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      conceptId = "es.gram.aspect.pret_imp",
      activeCohort = "adaptive",
      isFirstSession = false,
      consecutiveExplorationCount = 0,
      customState = null,
      userId = "usr_b1_learner_default",
    } = body;

    let conceptState = customState;
    if (!conceptState) {
      const profile = await reconstructLearnerState(userId);
      conceptState = profile.concepts[conceptId] || null;
    }

    // 1. Evaluate bandit candidate utilities and select action
    const rawDecision = selectPolicyAction(conceptState, activeCohort);

    // 2. Apply exploration guardrails (§30)
    const guardedDecision = applyExplorationGuardrails(rawDecision, {
      isFirstSession,
      consecutiveExplorationCount,
      maxConsecutiveExploration: 2,
    });

    // Compute near-tie margin threshold details
    const topValue = guardedDecision.candidates[0]?.estimatedValue || 0;
    const nearTies = guardedDecision.candidates.filter(
      (c) => topValue - c.estimatedValue <= 0.08
    );

    return NextResponse.json({
      success: true,
      decision: guardedDecision,
      nearTieAnalysis: {
        epsilon: 0.08,
        topValue,
        nearTieCount: nearTies.length,
        nearTieActions: nearTies.map((c) => c.action),
      },
    });
  } catch (error: any) {
    console.error("Policy decision error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
