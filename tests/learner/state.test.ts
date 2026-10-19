import {
  createInitialConceptState,
  updateConceptState,
  getEvidenceWeight,
} from "../../src/lib/learner/state";

function testLearnerState() {
  console.log("Testing Probabilistic Learner State Updates...");

  const state = createInitialConceptState("es.gram.aspect.pret_imp");
  console.log("Initial state mastery:", state.overallMastery, "uncertainty:", state.overallUncertainty);

  // 1. Check monotonicity initial
  const levels = state.levels;
  if (levels.spontaneous.estimate > levels.recognition.estimate) {
    throw new Error("Monotonicity violation in initial prior!");
  }

  // 2. Controlled drill correct update (weight = 1.0)
  const weight1 = getEvidenceWeight("diagnostic_item", "drill", 0.95);
  if (weight1 !== 1.0) throw new Error(`Expected weight 1.0, got ${weight1}`);

  updateConceptState(
    state,
    "correct",
    "diagnostic_item",
    "drill",
    0.95,
    null,
    new Date()
  );

  // 3. Conversational slip down-weighted (weight = 0.4)
  const weightConv = getEvidenceWeight("conversation_turn", "conversation", 0.85);
  if (weightConv !== 0.4) throw new Error(`Expected weight 0.4, got ${weightConv}`);

  updateConceptState(
    state,
    "incorrect",
    "conversation_turn",
    "conversation",
    0.85,
    "PI.01",
    new Date()
  );

  if (state.recurringMisconceptions["PI.01"] !== 1) {
    throw new Error("Misconception PI.01 not recorded in state!");
  }

  // Monotonicity check again
  if (state.levels.spontaneous.estimate > state.levels.recognition.estimate) {
    throw new Error("Monotonicity violated after update!");
  }

  console.log("✓ Learner state updates, monotonicity, and evidence weighting PASSED!");
}

testLearnerState();
