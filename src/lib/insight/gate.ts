export interface SupportingObservation {
  eventId: string;
  sessionId: string;
  activityType: string;
  evalConfidence: number;
  occurredAt: Date;
}

export interface CandidateInsight {
  diagnosisCode: string;
  conceptId: string;
  posteriorProbability: number; // 0.0 to 1.0
  observations: SupportingObservation[];
  counterHypothesisProbed: boolean;
  counterHypothesisCode?: string;
}

export interface GateCheckResult {
  passesGate: boolean;
  register: "unhedged" | "hedged" | "blocked";
  reasonsBlocked: string[];
  metrics: {
    posteriorProbability: number;
    observationCount: number;
    distinctActivityTypes: number;
    distinctSessions: number;
    counterHypothesisProbed: boolean;
    allConfidenceAboveThreshold: boolean;
  };
}

export interface SurfacedInsight {
  diagnosisCode: string;
  conceptId: string;
  register: "unhedged" | "hedged";
  text: string;
  confidence: number;
  generatedAt: Date;
}

/**
 * Validates whether an observation meets all 6 mandatory conditions of the Insight Gate (§9).
 */
export function checkInsightGate(
  candidate: CandidateInsight,
  circuitBreakerActive: boolean = false
): GateCheckResult {
  const reasonsBlocked: string[] = [];

  // Safety circuit breaker (§11): if wrong insight rate > 3%, halt surfacing
  if (circuitBreakerActive) {
    return {
      passesGate: false,
      register: "blocked",
      reasonsBlocked: ["Safety circuit breaker active (wrong-insight budget exceeded 3%)."],
      metrics: {
        posteriorProbability: candidate.posteriorProbability,
        observationCount: candidate.observations.length,
        distinctActivityTypes: 0,
        distinctSessions: 0,
        counterHypothesisProbed: candidate.counterHypothesisProbed,
        allConfidenceAboveThreshold: false,
      },
    };
  }

  // 1. Posterior probability >= 0.75
  const posteriorPassed = candidate.posteriorProbability >= 0.75;
  if (!posteriorPassed) {
    reasonsBlocked.push(
      `Posterior probability (${candidate.posteriorProbability.toFixed(2)}) is below 0.75 threshold.`
    );
  }

  // 2. Independent supporting observations >= 4
  const obsCount = candidate.observations.length;
  const obsCountPassed = obsCount >= 4;
  if (!obsCountPassed) {
    reasonsBlocked.push(
      `Supporting observations (${obsCount}) is below the required 4.`
    );
  }

  // 3. Distinct activity types >= 2
  const uniqueActivities = new Set(candidate.observations.map((o) => o.activityType));
  const activitiesPassed = uniqueActivities.size >= 2;
  if (!activitiesPassed) {
    reasonsBlocked.push(
      `Observations span only ${uniqueActivities.size} activity type(s); minimum 2 required.`
    );
  }

  // 4. Distinct sessions spanned >= 2
  const uniqueSessions = new Set(candidate.observations.map((o) => o.sessionId));
  const sessionsPassed = uniqueSessions.size >= 2;
  if (!sessionsPassed) {
    reasonsBlocked.push(
      `Observations span only ${uniqueSessions.size} session(s); minimum 2 required.`
    );
  }

  // 5. Leading counter-hypothesis actively probed >= 1 time
  const probePassed = candidate.counterHypothesisProbed;
  if (!probePassed) {
    reasonsBlocked.push(
      `Leading counter-hypothesis (${candidate.counterHypothesisCode || "alternative"}) has not been probed.`
    );
  }

  // 6. Evaluator confidence on supporting items >= 0.7 each
  const confidencePassed = candidate.observations.every((o) => o.evalConfidence >= 0.7);
  if (!confidencePassed) {
    reasonsBlocked.push(
      `One or more supporting observations have evaluator confidence below 0.7.`
    );
  }

  const passesGate =
    posteriorPassed &&
    obsCountPassed &&
    activitiesPassed &&
    sessionsPassed &&
    probePassed &&
    confidencePassed;

  let register: "unhedged" | "hedged" | "blocked" = "blocked";
  if (passesGate) {
    register = candidate.posteriorProbability >= 0.85 ? "unhedged" : "hedged";
  }

  return {
    passesGate,
    register,
    reasonsBlocked,
    metrics: {
      posteriorProbability: candidate.posteriorProbability,
      observationCount: obsCount,
      distinctActivityTypes: uniqueActivities.size,
      distinctSessions: uniqueSessions.size,
      counterHypothesisProbed: probePassed,
      allConfidenceAboveThreshold: confidencePassed,
    },
  };
}

/**
 * Generates pedagogical phrasing in hedged or unhedged register (§10).
 */
export function formatSurfacedInsight(
  code: string,
  conceptId: string,
  register: "unhedged" | "hedged",
  confidence: number
): SurfacedInsight {
  const phrasing = INSIGHT_PHRASINGS[code] || {
    unhedged: `You have an identifiable pattern with ${code}.`,
    hedged: `We think you may be experiencing some instability with ${code}. Let's test this soon.`,
  };

  return {
    diagnosisCode: code,
    conceptId,
    register,
    text: register === "unhedged" ? phrasing.unhedged : phrasing.hedged,
    confidence,
    generatedAt: new Date(),
  };
}

const INSIGHT_PHRASINGS: Record<string, { unhedged: string; hedged: string }> = {
  "PI.01": {
    unhedged:
      "You understand the imperfect conceptually, but when telling a story spontaneously, you tend to use the preterite for background scene-setting.",
    hedged:
      "It looks like your past-tense choices when setting the background of a story might be shifting to the preterite. A couple of quick items next time will confirm.",
  },
  "PI.06": {
    unhedged:
      "You consistently flatten past narratives entirely into the preterite, leaving out the aspectual camera-angle provided by the imperfect.",
    hedged:
      "In longer stories, you might be defaulting everything to the preterite. We will test a scene-setting contrast next session.",
  },
  "PP.01": {
    unhedged:
      "Your por/para difficulty isn't about rules generally. You consistently confuse beneficiary (acting on behalf of someone, por) with purpose or recipient (para).",
    hedged:
      "I think your por/para errors are specifically about beneficiary versus purpose rather than the rules generally. Two quick items will tell us.",
  },
  "PP.03": {
    unhedged:
      "You frequently collapse backward-looking cause (por) into forward-looking purpose (para).",
    hedged:
      "It appears you may be treating causes and goals similarly when choosing between por and para. We'll verify this distinction.",
  },
};
