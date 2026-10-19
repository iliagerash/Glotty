export interface GateMetrics {
  totalItems: number;
  binaryAccuracy: number;
  precisionOnIncorrect: number;
  diagnosisTop1Accuracy: number;
  uncertainRate: number;
  syncLatencyP95Ms: number;
  allGatesPassed: boolean;
  gateDetails: {
    binaryAccuracyPassed: boolean;
    precisionOnIncorrectPassed: boolean;
    diagnosisAccuracyPassed: boolean;
    uncertainRatePassed: boolean;
    latencyPassed: boolean;
  };
}

export interface EvaluatedItem {
  id: string;
  expectedEvaluation: "correct" | "incorrect" | "uncertain";
  expectedDiagnosis: string | null;
  actualEvaluation: "correct" | "incorrect" | "uncertain";
  actualDiagnosis: string | null;
}

export function computeGateMetrics(
  items: EvaluatedItem[],
  syncLatenciesMs: number[]
): GateMetrics {
  const total = items.length;
  if (total === 0) {
    throw new Error("Cannot compute gate metrics on empty dataset.");
  }

  let binaryCorrectCount = 0;
  let predictedIncorrectCount = 0;
  let trueIncorrectCount = 0;
  let correctDiagnosisCount = 0;
  let totalIncorrectGroundTruth = 0;
  let uncertainCount = 0;

  for (const item of items) {
    if (item.actualEvaluation === "uncertain") {
      uncertainCount++;
    }

    // Binary comparison: evaluation matches expected
    if (item.actualEvaluation === item.expectedEvaluation) {
      binaryCorrectCount++;
    }

    if (item.actualEvaluation === "incorrect") {
      predictedIncorrectCount++;
      if (item.expectedEvaluation === "incorrect") {
        trueIncorrectCount++;
      }
    }

    if (item.expectedEvaluation === "incorrect") {
      totalIncorrectGroundTruth++;
      if (
        item.actualEvaluation === "incorrect" &&
        item.actualDiagnosis === item.expectedDiagnosis
      ) {
        correctDiagnosisCount++;
      }
    }
  }

  const binaryAccuracy = binaryCorrectCount / total;
  const precisionOnIncorrect =
    predictedIncorrectCount > 0 ? trueIncorrectCount / predictedIncorrectCount : 1.0;
  const diagnosisTop1Accuracy =
    totalIncorrectGroundTruth > 0 ? correctDiagnosisCount / totalIncorrectGroundTruth : 1.0;
  const uncertainRate = uncertainCount / total;

  // Calculate p95 latency
  const sortedLatencies = [...syncLatenciesMs].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedLatencies.length * 0.95);
  const syncLatencyP95Ms = sortedLatencies[p95Index] || 0;

  const binaryAccuracyPassed = binaryAccuracy >= 0.9;
  const precisionOnIncorrectPassed = precisionOnIncorrect >= 0.95;
  const diagnosisAccuracyPassed = diagnosisTop1Accuracy >= 0.65;
  const uncertainRatePassed = uncertainRate <= 0.15;
  const latencyPassed = syncLatencyP95Ms < 200;

  const allGatesPassed =
    binaryAccuracyPassed &&
    precisionOnIncorrectPassed &&
    diagnosisAccuracyPassed &&
    uncertainRatePassed &&
    latencyPassed;

  return {
    totalItems: total,
    binaryAccuracy,
    precisionOnIncorrect,
    diagnosisTop1Accuracy,
    uncertainRate,
    syncLatencyP95Ms,
    allGatesPassed,
    gateDetails: {
      binaryAccuracyPassed,
      precisionOnIncorrectPassed,
      diagnosisAccuracyPassed,
      uncertainRatePassed,
      latencyPassed,
    },
  };
}
