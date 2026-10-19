import { PolicyAction, PolicyDecision, ExplanationStyle } from "./bandit";

export interface ExplorationGuardrails {
  isFirstSession: boolean;
  consecutiveExplorationCount: number;
  maxConsecutiveExploration: number;
}

/**
 * Enforces exploration guardrails as specified in §30:
 * - Learners in their first session are restricted to explanation-style randomization only.
 * - Caps consecutive exploratory actions to prevent degraded learner experience.
 * - Never randomizes feedback correctness or inappropriate difficulty gaps.
 */
export function applyExplorationGuardrails(
  decision: PolicyDecision,
  guardrails: ExplorationGuardrails
): PolicyDecision {
  // 1. If first session, suppress action/jitter exploration (§30)
  if (guardrails.isFirstSession) {
    if (decision.explorationType === "near_tie" || decision.explorationType === "jitter") {
      const topAction = decision.candidates[0]?.action || "conversation";
      return {
        ...decision,
        action: topAction,
        isExploration: false,
        explorationType: null,
        jitterFactor: 1.0,
      };
    }
  }

  // 2. Cap consecutive exploratory actions (§30)
  if (
    decision.isExploration &&
    guardrails.consecutiveExplorationCount >= guardrails.maxConsecutiveExploration
  ) {
    const topAction = decision.candidates[0]?.action || "conversation";
    return {
      ...decision,
      action: topAction,
      isExploration: false,
      explorationType: null,
      jitterFactor: 1.0,
    };
  }

  return decision;
}

/**
 * Calculates off-policy importance weight for counterfactual evaluation (§29, §37):
 * w = P_target(a|s) / P_behavior(a|s)
 */
export function calculateImportanceWeight(
  targetPolicyPropensity: number,
  loggedBehaviorPropensity: number
): number {
  if (loggedBehaviorPropensity <= 0) return 0;
  return targetPolicyPropensity / loggedBehaviorPropensity;
}
