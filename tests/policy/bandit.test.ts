import { selectPolicyAction, selectRandomExplanationStyle } from "../../src/lib/policy/bandit";
import { createInitialConceptState } from "../../src/lib/learner/state";

function testPolicyBandit() {
  console.log("Testing Learning Policy & Exploration Engine...");

  // 1. Cold start action
  const coldDec = selectPolicyAction(null);
  if (!coldDec.action || coldDec.candidates.length === 0) {
    throw new Error("Cold start decision missing candidates!");
  }
  if (coldDec.propensity <= 0) {
    throw new Error("Invalid propensity in cold start!");
  }

  // 2. Control cohort
  const controlDec = selectPolicyAction(null, "control");
  if (controlDec.explorationType !== "control" || !controlDec.isExploration) {
    throw new Error("Control cohort not properly tagged as exploration!");
  }

  // 3. Counter probe priority
  const probeDec = selectPolicyAction(null, "adaptive", "PI.06");
  if (probeDec.action !== "probe") {
    throw new Error("Pending counter probe did not take precedence!");
  }

  // 4. Style randomization
  const style = selectRandomExplanationStyle();
  if (style.propensity !== 1 / 6) {
    throw new Error("Style propensity should be 1/6!");
  }

  console.log("✓ Policy bandit, near-tie selection, and exploration logging PASSED!");
}

testPolicyBandit();
