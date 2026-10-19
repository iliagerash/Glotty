import { ConceptLearnerState } from "../learner/state";

export type PolicyAction =
  | "review"
  | "explain"
  | "contrast"
  | "produce"
  | "read"
  | "conversation"
  | "probe"
  | "nothing";

export type ExplanationStyle =
  | "rule_based"
  | "conceptual"
  | "contrastive"
  | "etymological"
  | "cross_linguistic"
  | "example_first";

export interface PolicyCandidate {
  action: PolicyAction;
  estimatedValue: number;
}

export interface PolicyDecision {
  action: PolicyAction;
  candidates: PolicyCandidate[];
  propensity: number;
  isExploration: boolean;
  explorationType: "near_tie" | "style" | "jitter" | "control" | null;
  explanationStyle?: ExplanationStyle;
  jitterFactor?: number;
}

const ALL_EXPLANATION_STYLES: ExplanationStyle[] = [
  "rule_based",
  "conceptual",
  "contrastive",
  "etymological",
  "cross_linguistic",
  "example_first",
];

const EPSILON_MARGIN = 0.08; // Near-tie threshold (§29)

/**
 * Evaluates candidate interventions given current concept state and selects
 * an action with deliberate, logged exploration (§27-§30).
 */
export function selectPolicyAction(
  conceptState: ConceptLearnerState | null,
  activeCohort: "adaptive" | "control" = "adaptive",
  pendingCounterProbeCode: string | null = null
): PolicyDecision {
  // If control cohort (§44), follow standard static progression
  if (activeCohort === "control") {
    return {
      action: "review",
      candidates: [{ action: "review", estimatedValue: 1.0 }],
      propensity: 1.0,
      isExploration: true,
      explorationType: "control",
      explanationStyle: "rule_based",
    };
  }

  // If a leading counter-hypothesis must be probed to satisfy the insight gate (§9)
  if (pendingCounterProbeCode) {
    return {
      action: "probe",
      candidates: [
        { action: "probe", estimatedValue: 0.95 },
        { action: "review", estimatedValue: 0.5 },
      ],
      propensity: 1.0,
      isExploration: false,
      explorationType: null,
    };
  }

  // If no state yet (session 1 cold start), favor conversation & reading
  if (!conceptState || conceptState.totalObservations === 0) {
    return {
      action: "conversation",
      candidates: [
        { action: "conversation", estimatedValue: 0.9 },
        { action: "read", estimatedValue: 0.7 },
        { action: "produce", estimatedValue: 0.5 },
      ],
      propensity: 0.85,
      isExploration: false,
      explorationType: null,
      explanationStyle: selectRandomExplanationStyle().style,
    };
  }

  const { overallMastery, overallUncertainty, levels, recurringMisconceptions } = conceptState;

  // Compute utilities for candidate actions
  const candidates: PolicyCandidate[] = [];

  // 1. If recurring misconception exists, contrast and explain are high utility
  const hasRecurringError = Object.values(recurringMisconceptions).some((cnt) => cnt >= 2);
  if (hasRecurringError) {
    candidates.push({ action: "contrast", estimatedValue: 0.88 });
    candidates.push({ action: "explain", estimatedValue: 0.82 });
  }

  // 2. High recognition but low production gap (§3)
  const gap = levels.recognition.estimate - levels.production.estimate;
  if (gap > 0.25) {
    candidates.push({ action: "produce", estimatedValue: 0.85 });
  }

  // 3. Spontaneous conversation
  candidates.push({
    action: "conversation",
    estimatedValue: 0.5 + (1 - overallUncertainty) * 0.3,
  });

  // 4. Reading for comprehensible input (§31)
  candidates.push({ action: "read", estimatedValue: 0.65 });

  // 5. Review practice
  candidates.push({ action: "review", estimatedValue: 0.6 });

  // 6. Nothing (null action) if mastery is very high and recently consolidated (§27)
  if (overallMastery > 0.85 && overallUncertainty < 0.15) {
    candidates.push({ action: "nothing", estimatedValue: 0.8 });
  }

  // Sort by estimated value descending
  candidates.sort((a, b) => b.estimatedValue - a.estimatedValue);

  const topValue = candidates[0].estimatedValue;
  // Identify near-ties within EPSILON_MARGIN
  const nearTies = candidates.filter(
    (c) => topValue - c.estimatedValue <= EPSILON_MARGIN
  );

  let chosenAction: PolicyAction;
  let propensity: number;
  let isExploration = false;
  let explorationType: "near_tie" | "style" | "jitter" | "control" | null = null;

  if (nearTies.length > 1) {
    // Near-tie exploration: uniform random selection among competitive actions (§29)
    const pickedIndex = Math.floor(Math.random() * nearTies.length);
    chosenAction = nearTies[pickedIndex].action;
    propensity = 1.0 / nearTies.length;
    isExploration = true;
    explorationType = "near_tie";
  } else {
    chosenAction = candidates[0].action;
    propensity = 0.9;
  }

  // Explanation style randomization (§20)
  const styleRes = selectRandomExplanationStyle();

  // Retention jitter (~10% probability, §29)
  let jitterFactor = 1.0;
  if (Math.random() < 0.1) {
    const jitters = [0.7, 1.4];
    jitterFactor = jitters[Math.floor(Math.random() * jitters.length)];
    isExploration = true;
    explorationType = explorationType || "jitter";
  }

  return {
    action: chosenAction,
    candidates,
    propensity,
    isExploration,
    explorationType,
    explanationStyle: styleRes.style,
    jitterFactor,
  };
}

export function selectRandomExplanationStyle(): {
  style: ExplanationStyle;
  propensity: number;
} {
  const index = Math.floor(Math.random() * ALL_EXPLANATION_STYLES.length);
  return {
    style: ALL_EXPLANATION_STYLES[index],
    propensity: 1.0 / ALL_EXPLANATION_STYLES.length, // 1/6
  };
}
