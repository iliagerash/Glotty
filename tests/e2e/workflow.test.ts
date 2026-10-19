import { db } from "../../src/db";
import { events, learningSessions, insightFeedbacks, user } from "../../src/db/schema";
import { evaluateSync } from "../../src/lib/evaluator/sync";
import { evaluateAsync } from "../../src/lib/evaluator/async";
import { selectPolicyAction } from "../../src/lib/policy/bandit";
import { reconstructLearnerState } from "../../src/lib/learner/replay";
import { checkInsightGate, formatSurfacedInsight, CandidateInsight } from "../../src/lib/insight/gate";
import { eq } from "drizzle-orm";

async function runEndToEndIntegrationTest() {
  console.log("=================================================");
  console.log(" 🚀 GLOTTY END-TO-END INTEGRATION TEST");
  console.log("=================================================");

  const testUserId = "usr_b1_learner_default";

  // 1. Clean previous test events for this user to ensure pristine state
  console.log("\n[1/5] Resetting test state for learner...");
  await db.delete(events).where(eq(events.userId, testUserId));
  await db.delete(learningSessions).where(eq(learningSessions.userId, testUserId));
  console.log("✓ Pristine test state established.");

  // 2. Start Session 1 (Cold Start)
  console.log("\n[2/5] Initializing Session 1 (Cold Start Protocol §12)...");
  const [session1] = await db
    .insert(learningSessions)
    .values({
      userId: testUserId,
      sessionNumber: 1,
      status: "active",
      goal: "Cold-start conversational narrative baseline (§12, §43)",
    })
    .returning();
  console.log(`✓ Session 1 created: ID = ${session1.id}`);

  // 3. Simulate Conversational Turns across Sessions
  console.log("\n[3/5] Executing Conversational Turns & Dual-Path Evaluation...");

  const turns = [
    {
      sessionId: session1.id,
      prompt: "Cuéntame sobre tus vacaciones pasadas.",
      response: "Cuando fui joven, jugué al fútbol todos los días.",
      conceptId: "es.gram.aspect.pret_imp",
      expectedDiagnosis: "PI.01",
    },
    {
      sessionId: session1.id,
      prompt: "¿Qué pasó mientras ibas a trabajar?",
      response: "Ayer iba al supermercado y compré leche cuando me encontré con Juan.",
      conceptId: "es.gram.aspect.pret_imp",
      expectedDiagnosis: null,
    },
    {
      sessionId: session1.id,
      prompt: "¿Por qué hiciste el turno de Carlos?",
      response: "Fui a la reunión para Carlos porque él estaba enfermo en cama.",
      conceptId: "es.sem.por_para",
      expectedDiagnosis: "PP.01",
    },
  ];

  for (const turn of turns) {
    const syncRes = evaluateSync(turn.response, turn.conceptId);
    const asyncRes = await evaluateAsync(turn.prompt, turn.response, turn.conceptId);
    const policy = selectPolicyAction(null, "adaptive");

    // Append to PostgreSQL events table (Appendix A schema)
    const [insertedEvent] = await db
      .insert(events)
      .values({
        userId: testUserId,
        sessionId: turn.sessionId,
        occurredAt: new Date(),
        language: "es",
        l1Languages: ["en"],
        conceptIds: [turn.conceptId],
        activityType: "conversation_turn",
        promptText: turn.prompt,
        rawResponse: turn.response,
        responseModality: "text",
        latencyMs: syncRes.latencyMs,
        evaluation: asyncRes.evaluation,
        evalConfidence: asyncRes.evalConfidence,
        diagnosisCode: asyncRes.diagnosisCode,
        diagnosisConfidence: asyncRes.diagnosisConfidence,
        evaluatorVersion: asyncRes.evaluatorVersion,
        evalPath: "async",
        policyAction: policy.action,
        policyCandidates: policy.candidates,
        propensity: policy.propensity,
        isExploration: policy.isExploration,
        explorationType: policy.explorationType,
        cohort: "adaptive",
        exposureContext: "conversation",
        evidenceWeight: 0.4,
      })
      .returning();

    console.log(
      `  • Turn evaluated: sync ${syncRes.latencyMs}ms | eval: ${asyncRes.evaluation} | code: ${asyncRes.diagnosisCode || "NONE"} | event saved: ${insertedEvent.eventId}`
    );
  }

  // 4. Verify Learner State Reconstruction from Events (§35)
  console.log("\n[4/5] Testing Historical State Reconstruction from Events (§35)...");
  const reconstructedProfile = await reconstructLearnerState(testUserId);
  const aspectState = reconstructedProfile.concepts["es.gram.aspect.pret_imp"];
  const porParaState = reconstructedProfile.concepts["es.sem.por_para"];

  if (!aspectState || !porParaState) {
    throw new Error("Failed to reconstruct concept states from events!");
  }

  console.log(`✓ Aspect Mastery: ${(aspectState.overallMastery * 100).toFixed(1)}% (Uncertainty: ±${(aspectState.overallUncertainty * 100).toFixed(1)}%, Obs: ${aspectState.totalObservations})`);
  console.log(`✓ Por/Para Mastery: ${(porParaState.overallMastery * 100).toFixed(1)}% (Uncertainty: ±${(porParaState.overallUncertainty * 100).toFixed(1)}%, Obs: ${porParaState.totalObservations})`);

  // 5. Complete Session 1 & Verify Cold-Start Gate Protection (§12)
  console.log("\n[5/5] Testing Insight Gate on Session 1 Close...");
  const recordedEvents = await db.select().from(events).where(eq(events.userId, testUserId));
  console.log(`Total events recorded in Postgres: ${recordedEvents.length}`);

  // In session 1, gate must strictly BLOCK learner claims
  const candidatePI01: CandidateInsight = {
    diagnosisCode: "PI.01",
    conceptId: "es.gram.aspect.pret_imp",
    posteriorProbability: 0.76,
    observations: recordedEvents
      .filter((e) => e.diagnosisCode === "PI.01")
      .map((e) => ({
        eventId: e.eventId,
        sessionId: e.sessionId,
        activityType: e.activityType,
        evalConfidence: e.evalConfidence || 0.8,
        occurredAt: e.occurredAt,
      })),
    counterHypothesisProbed: false,
  };

  const gateResult = checkInsightGate(candidatePI01);
  if (gateResult.passesGate) {
    throw new Error("Gate failed to protect cold-start session 1!");
  }
  console.log(`✓ Cold start gate protected credibility: Insight blocked as expected. Reasons: ${gateResult.reasonsBlocked.join("; ")}`);

  console.log("\n=================================================");
  console.log(" ✨ ALL END-TO-END WORKFLOW INTEGRATION TESTS PASSED!");
  console.log("=================================================");
  process.exit(0);
}

runEndToEndIntegrationTest().catch((err) => {
  console.error("Integration test error:", err);
  process.exit(1);
});
