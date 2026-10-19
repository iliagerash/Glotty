export interface ItemAnswerKey {
  accepted: string[];
  rejected?: Array<{ form: string; diagnosisCode?: string }>;
  fixedRules?: string[];
}

export interface SyncEvaluationResult {
  evaluation: "correct" | "incorrect" | "uncertain";
  evalConfidence: number;
  diagnosisCode: string | null;
  diagnosisConfidence: number | null;
  latencyMs: number;
  evalPath: "sync";
  evaluatorVersion: string;
}

const EVALUATOR_VERSION = "sync-rule-v1.0";

/**
 * High-speed Synchronous Evaluator (<200ms target).
 * Performs exact/normalized answer-key matching and fast morphological analysis.
 * Strictly NO network or LLM calls.
 */
export function evaluateSync(
  response: string,
  conceptId?: string,
  answerKey?: ItemAnswerKey | null
): SyncEvaluationResult {
  const startTime = performance.now();

  const clean = normalizeText(response);

  // 1. Check against precomputed answer key if available
  if (answerKey && answerKey.accepted && answerKey.accepted.length > 0) {
    const acceptedNormalized = answerKey.accepted.map(normalizeText);
    if (acceptedNormalized.includes(clean)) {
      const elapsed = performance.now() - startTime;
      return {
        evaluation: "correct",
        evalConfidence: 0.99,
        diagnosisCode: null,
        diagnosisConfidence: null,
        latencyMs: Math.round(elapsed),
        evalPath: "sync",
        evaluatorVersion: EVALUATOR_VERSION,
      };
    }

    if (answerKey.rejected) {
      for (const rej of answerKey.rejected) {
        if (clean === normalizeText(rej.form)) {
          const elapsed = performance.now() - startTime;
          return {
            evaluation: "incorrect",
            evalConfidence: 0.95,
            diagnosisCode: rej.diagnosisCode || null,
            diagnosisConfidence: rej.diagnosisCode ? 0.9 : null,
            latencyMs: Math.round(elapsed),
            evalPath: "sync",
            evaluatorVersion: EVALUATOR_VERSION,
          };
        }
      }
    }
  }

  // 2. Fast heuristic evaluation for targeted concepts
  if (conceptId === "es.sem.por_para") {
    // Fixed lexical chunks check (PP.07)
    if (/gracias\s+para\b/i.test(clean) || /para\s+favor\b/i.test(clean) || /para\s+fin\b/i.test(clean)) {
      const elapsed = performance.now() - startTime;
      return {
        evaluation: "incorrect",
        evalConfidence: 0.95,
        diagnosisCode: "PP.07",
        diagnosisConfidence: 0.95,
        latencyMs: Math.round(elapsed),
        evalPath: "sync",
        evaluatorVersion: EVALUATOR_VERSION,
      };
    }
    if (/gracias\s+por\b/i.test(clean) || /por\s+favor\b/i.test(clean) || /por\s+fin\b/i.test(clean)) {
      const elapsed = performance.now() - startTime;
      return {
        evaluation: "correct",
        evalConfidence: 0.9,
        diagnosisCode: null,
        diagnosisConfidence: null,
        latencyMs: Math.round(elapsed),
        evalPath: "sync",
        evaluatorVersion: EVALUATOR_VERSION,
      };
    }
  }

  // 3. For complex free-form items, sync path abstains to UNCERTAIN
  // and hands off to async diagnostic evaluation (§22)
  const elapsed = performance.now() - startTime;
  return {
    evaluation: "uncertain",
    evalConfidence: 0.4,
    diagnosisCode: null,
    diagnosisConfidence: null,
    latencyMs: Math.round(elapsed),
    evalPath: "sync",
    evaluatorVersion: EVALUATOR_VERSION,
  };
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[¿?¡!.,;:"'()]/g, "")
    .replace(/\s+/g, " ");
}
