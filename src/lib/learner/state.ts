export type CompetenceKind =
  | "recognition"
  | "contextual"
  | "recall"
  | "production"
  | "spontaneous";

export interface CompetenceLevelState {
  estimate: number; // posterior mean (0.0 to 1.0)
  uncertainty: number; // posterior standard deviation
  alpha: number; // Beta distribution parameter
  beta: number; // Beta distribution parameter
  evidenceCount: number;
}

export interface ConceptLearnerState {
  conceptId: string;
  overallMastery: number; // 0.0 to 1.0
  overallUncertainty: number;
  levels: Record<CompetenceKind, CompetenceLevelState>;
  recurringMisconceptions: Record<string, number>; // code -> observation count
  lastObservedAt: Date | null;
  totalObservations: number;
}

export interface LearnerProfile {
  userId: string;
  language: string;
  concepts: Record<string, ConceptLearnerState>;
  updatedAt: Date;
}

// Evidence weights as defined in §16
export function getEvidenceWeight(
  activityType: string,
  exposureContext: string,
  evalConfidence: number
): number {
  if (evalConfidence < 0.5) return 0.1;
  if (exposureContext === "conversation" || activityType === "conversation_turn") return 0.4;
  if (activityType === "reading") return 0.6;
  if (activityType === "constrained_production") return 0.8;
  if (activityType === "diagnostic_item" || exposureContext === "drill") return 1.0;
  return 0.7;
}

// B1 English speaker population prior (§17)
const B1_POPULATION_PRIOR: Record<CompetenceKind, { alpha: number; beta: number }> = {
  recognition: { alpha: 7.0, beta: 3.0 }, // ~70% prior
  contextual: { alpha: 6.0, beta: 4.0 }, // ~60% prior
  recall: { alpha: 5.0, beta: 5.0 }, // ~50% prior
  production: { alpha: 4.0, beta: 6.0 }, // ~40% prior
  spontaneous: { alpha: 3.0, beta: 7.0 }, // ~30% prior
};

export function createInitialConceptState(conceptId: string): ConceptLearnerState {
  const levels: Record<CompetenceKind, CompetenceLevelState> = {
    recognition: initLevel(B1_POPULATION_PRIOR.recognition.alpha, B1_POPULATION_PRIOR.recognition.beta),
    contextual: initLevel(B1_POPULATION_PRIOR.contextual.alpha, B1_POPULATION_PRIOR.contextual.beta),
    recall: initLevel(B1_POPULATION_PRIOR.recall.alpha, B1_POPULATION_PRIOR.recall.beta),
    production: initLevel(B1_POPULATION_PRIOR.production.alpha, B1_POPULATION_PRIOR.production.beta),
    spontaneous: initLevel(B1_POPULATION_PRIOR.spontaneous.alpha, B1_POPULATION_PRIOR.spontaneous.beta),
  };

  return {
    conceptId,
    overallMastery: 0.5,
    overallUncertainty: 0.25,
    levels,
    recurringMisconceptions: {},
    lastObservedAt: null,
    totalObservations: 0,
  };
}

function initLevel(alpha: number, beta: number): CompetenceLevelState {
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1));
  return {
    estimate: mean,
    uncertainty: Math.sqrt(variance),
    alpha,
    beta,
    evidenceCount: 0,
  };
}

/**
 * Updates a concept's state using a new evaluated interaction (§14, §16).
 */
export function updateConceptState(
  state: ConceptLearnerState,
  evaluation: "correct" | "incorrect" | "uncertain",
  activityType: string,
  exposureContext: string,
  evalConfidence: number,
  diagnosisCode: string | null,
  occurredAt: Date
): ConceptLearnerState {
  const weight = getEvidenceWeight(activityType, exposureContext, evalConfidence);

  // Map activity to target competence level
  const targetLevel = mapActivityToCompetence(activityType);

  const levelState = state.levels[targetLevel];

  // Beta distribution Bayesian update with fractional evidence weight
  if (evaluation === "correct") {
    levelState.alpha += weight * 1.0;
  } else if (evaluation === "incorrect") {
    levelState.beta += weight * 1.0;
    if (diagnosisCode) {
      state.recurringMisconceptions[diagnosisCode] =
        (state.recurringMisconceptions[diagnosisCode] || 0) + 1;
    }
  } else {
    // Uncertain observation adds slight spread
    levelState.alpha += weight * 0.5;
    levelState.beta += weight * 0.5;
  }

  levelState.evidenceCount += 1;
  levelState.estimate = levelState.alpha / (levelState.alpha + levelState.beta);
  const variance =
    (levelState.alpha * levelState.beta) /
    (Math.pow(levelState.alpha + levelState.beta, 2) *
      (levelState.alpha + levelState.beta + 1));
  levelState.uncertainty = Math.sqrt(variance);

  // Enforce monotonicity constraint across kinds of knowing (§14):
  // spontaneous <= production <= recall <= contextual <= recognition
  enforceMonotonicity(state.levels);

  state.totalObservations += 1;
  state.lastObservedAt = occurredAt;

  // Recompute overall mastery and uncertainty
  let weightedSum = 0;
  let uncertaintySum = 0;
  const kinds: CompetenceKind[] = [
    "recognition",
    "contextual",
    "recall",
    "production",
    "spontaneous",
  ];
  for (const k of kinds) {
    weightedSum += state.levels[k].estimate;
    uncertaintySum += state.levels[k].uncertainty;
  }
  state.overallMastery = weightedSum / kinds.length;
  state.overallUncertainty = uncertaintySum / kinds.length;

  return state;
}

function mapActivityToCompetence(activityType: string): CompetenceKind {
  switch (activityType) {
    case "cloze":
    case "forced_choice":
      return "recognition";
    case "reading":
    case "listening":
      return "contextual";
    case "transformation":
      return "recall";
    case "constrained_production":
      return "production";
    case "free_production":
    case "conversation_turn":
    default:
      return "spontaneous";
  }
}

function enforceMonotonicity(levels: Record<CompetenceKind, CompetenceLevelState>) {
  const order: CompetenceKind[] = [
    "recognition",
    "contextual",
    "recall",
    "production",
    "spontaneous",
  ];
  // Forward pass: higher order cannot exceed predecessor
  for (let i = 1; i < order.length; i++) {
    const prev = levels[order[i - 1]];
    const curr = levels[order[i]];
    if (curr.estimate > prev.estimate) {
      curr.estimate = prev.estimate;
    }
  }
}
