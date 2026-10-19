export interface DSRState {
  difficulty: number; // 1.0 (easy) to 10.0 (hard)
  stability: number; // in days
  lastReviewedAt: Date;
}

/**
 * Computes predicted retrievability R(t) after deltaDays.
 * R(t) = (1 + deltaDays / (9 * S))^-1
 */
export function computeRetrievability(stability: number, deltaDays: number): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + deltaDays / (9 * Math.max(0.1, stability)), -1);
}

/**
 * Updates DSR state following an outcome (§17).
 */
export function updateDSR(
  current: DSRState | null,
  outcome: "correct" | "incorrect" | "uncertain",
  reviewedAt: Date,
  jitterFactor: number = 1.0
): { nextState: DSRState; nextIntervalDays: number } {
  if (!current) {
    const initDifficulty = outcome === "correct" ? 4.5 : 7.0;
    const initStability = outcome === "correct" ? 2.5 : 0.5;
    const nextInterval = Math.max(1, Math.round(initStability * jitterFactor));
    return {
      nextState: {
        difficulty: initDifficulty,
        stability: initStability,
        lastReviewedAt: reviewedAt,
      },
      nextIntervalDays: nextInterval,
    };
  }

  const deltaDays = Math.max(
    0.1,
    (reviewedAt.getTime() - current.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  const retrievability = computeRetrievability(current.stability, deltaDays);

  let nextStability: number;
  let nextDifficulty = current.difficulty;

  if (outcome === "correct") {
    // Retrievability bonus: harder retrieval gives bigger stability jump
    const factor = 1 + (1 - retrievability) * 2.0;
    nextStability = current.stability * factor;
    nextDifficulty = Math.max(1.0, current.difficulty - 0.2);
  } else if (outcome === "incorrect") {
    nextStability = Math.max(0.4, current.stability * 0.3);
    nextDifficulty = Math.min(10.0, current.difficulty + 0.8);
  } else {
    nextStability = current.stability * 1.1;
  }

  const nextIntervalDays = Math.max(1, Math.round(nextStability * jitterFactor));

  return {
    nextState: {
      difficulty: nextDifficulty,
      stability: nextStability,
      lastReviewedAt: reviewedAt,
    },
    nextIntervalDays,
  };
}
