import {
  checkInsightGate,
  CandidateInsight,
  formatSurfacedInsight,
} from "../../src/lib/insight/gate";

function testInsightGate() {
  console.log("Testing Insight Gate 6-Condition Rule Engine...");

  // Base candidate that satisfies all conditions
  const validCandidate: CandidateInsight = {
    diagnosisCode: "PP.01",
    conceptId: "es.sem.por_para",
    posteriorProbability: 0.88,
    observations: [
      {
        eventId: "e1",
        sessionId: "s1",
        activityType: "conversation_turn",
        evalConfidence: 0.85,
        occurredAt: new Date(),
      },
      {
        eventId: "e2",
        sessionId: "s1",
        activityType: "constrained_production",
        evalConfidence: 0.9,
        occurredAt: new Date(),
      },
      {
        eventId: "e3",
        sessionId: "s2",
        activityType: "diagnostic_item",
        evalConfidence: 0.8,
        occurredAt: new Date(),
      },
      {
        eventId: "e4",
        sessionId: "s2",
        activityType: "transformation",
        evalConfidence: 0.75,
        occurredAt: new Date(),
      },
    ],
    counterHypothesisProbed: true,
    counterHypothesisCode: "PP.06",
  };

  // Test 1: Full pass unhedged (p=0.88 >= 0.85)
  const res1 = checkInsightGate(validCandidate);
  if (!res1.passesGate || res1.register !== "unhedged") {
    throw new Error(`Test 1 Failed: Expected unhedged pass, got ${res1.register}`);
  }

  // Test 2: Full pass hedged (0.75 <= p < 0.85)
  const hedgedCandidate = { ...validCandidate, posteriorProbability: 0.79 };
  const res2 = checkInsightGate(hedgedCandidate);
  if (!res2.passesGate || res2.register !== "hedged") {
    throw new Error(`Test 2 Failed: Expected hedged pass, got ${res2.register}`);
  }

  // Test 3: Blocked by session count < 2
  const singleSessionCandidate = {
    ...validCandidate,
    observations: validCandidate.observations.map((o) => ({ ...o, sessionId: "s1" })),
  };
  const res3 = checkInsightGate(singleSessionCandidate);
  if (res3.passesGate) {
    throw new Error("Test 3 Failed: Single session candidate should have been blocked!");
  }

  // Test 4: Blocked by unprobed counter-hypothesis
  const unprobedCandidate = {
    ...validCandidate,
    counterHypothesisProbed: false,
  };
  const res4 = checkInsightGate(unprobedCandidate);
  if (res4.passesGate) {
    throw new Error("Test 4 Failed: Unprobed counter-hypothesis must block insight!");
  }

  // Test 5: Circuit breaker triggers
  const res5 = checkInsightGate(validCandidate, true);
  if (res5.passesGate || res5.register !== "blocked") {
    throw new Error("Test 5 Failed: Circuit breaker should block all insights!");
  }

  // Test 6: Phrasing generation
  const insight = formatSurfacedInsight("PP.01", "es.sem.por_para", "unhedged", 0.9);
  if (!insight.text.includes("beneficiary")) {
    throw new Error("Insight phrasing missing pedagogical focus!");
  }

  console.log("✓ Insight gate 6-condition rule engine & hedging PASSED!");
}

import { test } from "node:test";
test("insight gate", testInsightGate);
