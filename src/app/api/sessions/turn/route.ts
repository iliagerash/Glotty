import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, learningSessions } from "@/db/schema";
import { evaluateSync } from "@/lib/evaluator/sync";
import { evaluateAsync } from "@/lib/evaluator/gemini_async";
import { selectPolicyAction } from "@/lib/policy/bandit";
import { reconstructLearnerState } from "@/lib/learner/replay";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, userId = "usr_b1_learner_default", userMessage, currentPrompt } = body;

    if (!sessionId || !userMessage) {
      return NextResponse.json(
        { success: false, error: "Missing sessionId or userMessage" },
        { status: 400 }
      );
    }

    // Determine target linguistic domain based on content
    const lower = userMessage.toLowerCase();
    const isPorPara = /\b(por|para)\b/i.test(lower);
    const conceptIds = isPorPara ? ["es.sem.por_para"] : ["es.gram.aspect.pret_imp"];

    // 1. High-speed Synchronous Evaluation (<200ms budget, strictly NO LLM)
    const syncResult = evaluateSync(userMessage, conceptIds[0]);

    // 2. Asynchronous Diagnostic Evaluation (Gemini 1.5 Flash)
    const asyncResult = await evaluateAsync(currentPrompt || "", userMessage, conceptIds[0]);

    // 3. Retrieve current learner state
    const learnerProfile = await reconstructLearnerState(userId);
    const conceptState = learnerProfile.concepts[conceptIds[0]] || null;

    // 4. Learning Policy with exploration logging (§27-§30)
    const policyDecision = selectPolicyAction(conceptState, "adaptive");

    // 5. Append immutable event to PostgreSQL (Appendix A schema)
    await db.insert(events).values({
      userId,
      sessionId,
      occurredAt: new Date(),
      language: "es",
      l1Languages: ["en"],
      conceptIds,
      activityType: "conversation_turn",
      promptText: currentPrompt || null,
      rawResponse: userMessage, // Raw response is NEVER discarded (§33)
      responseModality: "text",
      latencyMs: syncResult.latencyMs,
      evaluation: asyncResult.evaluation,
      evalConfidence: asyncResult.evalConfidence,
      diagnosisCode: asyncResult.diagnosisCode,
      diagnosisConfidence: asyncResult.diagnosisConfidence,
      evaluatorVersion: asyncResult.evaluatorVersion,
      evalPath: "async",
      policyAction: policyDecision.action,
      policyCandidates: policyDecision.candidates,
      propensity: policyDecision.propensity,
      isExploration: policyDecision.isExploration,
      explorationType: policyDecision.explorationType,
      cohort: "adaptive",
      exposureContext: "conversation",
      evidenceWeight: 0.4, // Free conversation evidence weight (§16)
    });

    // 6. Generate natural conversational tutor reply (§6: non-intrusive flow)
    const tutorReply = generateConversationalResponse(
      userMessage,
      asyncResult.diagnosisCode,
      policyDecision.action
    );

    return NextResponse.json({
      success: true,
      reply: tutorReply,
      syncLatencyMs: syncResult.latencyMs,
      evaluation: asyncResult.evaluation,
      diagnosisCode: asyncResult.diagnosisCode,
      isExploration: policyDecision.isExploration,
      explorationType: policyDecision.explorationType,
      policyAction: policyDecision.action,
    });
  } catch (error: any) {
    console.error("Error processing turn:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

function generateConversationalResponse(
  message: string,
  detectedMisconception: string | null,
  policyAction: string
): string {
  // If the policy picked 'probe' to test a distinguishing hypothesis
  if (policyAction === "probe" || detectedMisconception === "PP.01") {
    return "¡Qué interesante! Por cierto, si tuvieras que pedirle a un compañero que vaya a la oficina en tu lugar, ¿cómo se lo dirías en español?";
  }

  if (detectedMisconception === "PI.01") {
    return "Tiene mucho sentido. Y mientras todo eso sucedía a tu alrededor, ¿qué estaba haciendo la otra gente o cómo era el ambiente en ese momento?";
  }

  // Fluid natural conversational replies without interrupting grammar pedantry (§6)
  const responses = [
    "¡Comprendo perfectamente! Me llama mucho la atención cómo se desarrolló esa situación. ¿Cómo reaccionaron las personas a tu alrededor?",
    "¡Vaya experiencia! Suena a uno de esos momentos que dejan huella. ¿Qué fue lo más inesperado de todo lo que ocurrió?",
    "Qué bien lo explicas. Es muy curioso ver cómo sucedieron las cosas. ¿Cambiarías algo si volvieras a vivir ese día?",
  ];

  const index = Math.abs(message.length) % responses.length;
  return responses[index];
}
