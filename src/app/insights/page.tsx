"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  ThumbsUp,
  ThumbsDown,
  AlertOctagon,
  RefreshCw,
  HelpCircle,
} from "lucide-react";

export default function InsightStudio() {
  // Gate parameters
  const [diagnosisCode, setDiagnosisCode] = useState("PP.01");
  const [posteriorProb, setPosteriorProb] = useState(0.88);
  const [obsCount, setObsCount] = useState(4);
  const [distinctActivities, setDistinctActivities] = useState(2);
  const [distinctSessions, setDistinctSessions] = useState(2);
  const [counterProbed, setCounterProbed] = useState(true);
  const [evalConfidence, setEvalConfidence] = useState(0.85);
  const [forceCircuitBreaker, setForceCircuitBreaker] = useState(false);

  // Gate evaluation result
  const [gateData, setGateData] = useState<any>(null);
  const [evaluatingGate, setEvaluatingGate] = useState(false);

  // Live metrics from Postgres
  const [feedbackMetrics, setFeedbackMetrics] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  useEffect(() => {
    evaluateGate();
    fetchMetrics();
  }, [
    diagnosisCode,
    posteriorProb,
    obsCount,
    distinctActivities,
    distinctSessions,
    counterProbed,
    evalConfidence,
    forceCircuitBreaker,
  ]);

  const evaluateGate = async () => {
    setEvaluatingGate(true);
    try {
      const res = await fetch("/api/insights/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosisCode,
          conceptId: diagnosisCode.startsWith("PI") ? "es.gram.aspect.pret_imp" : "es.sem.por_para",
          posteriorProbability: posteriorProb,
          observationCount: obsCount,
          distinctActivityTypes: distinctActivities,
          distinctSessions,
          counterHypothesisProbed: counterProbed,
          minEvalConfidence: evalConfidence,
          forceCircuitBreaker,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGateData(data);
      }
    } catch (e) {
      console.error("Error evaluating gate:", e);
    } finally {
      setEvaluatingGate(false);
    }
  };

  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const res = await fetch("/api/insights/metrics");
      const data = await res.json();
      if (data.success) {
        setFeedbackMetrics(data);
      }
    } catch (e) {
      console.error("Error fetching metrics:", e);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleInjectFeedback = async (rating: "useful" | "not_useful" | "wrong") => {
    try {
      await fetch("/api/insights/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosisCode,
          rating,
          notes: `Injected via Insight Studio testbed (${rating})`,
        }),
      });
      await fetchMetrics();
    } catch (e) {
      console.error("Failed to inject feedback:", e);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1b253b] pb-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-lg bg-[#111726] border border-[#222f49] hover:bg-[#18233c] text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Insight Discipline & Gating Studio (§8–§12)
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                Milestone 5
              </span>
            </div>
            <p className="text-xs text-slate-400">
              "Glotty is silent by default and earns the right to speak. A wrong insight costs credibility, and credibility is the entire product." — §8
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/evaluator"
            className="px-3.5 py-1.5 rounded-lg border border-[#1d2b48] bg-[#121a2c] text-slate-300 hover:bg-[#18233c] text-xs transition-colors"
          >
            Evaluator Studio
          </Link>
          <Link
            href="/learner"
            className="px-3.5 py-1.5 rounded-lg border border-[#1d2b48] bg-[#121a2c] text-slate-300 hover:bg-[#18233c] text-xs transition-colors"
          >
            Learner Studio
          </Link>
          <Link
            href="/policy"
            className="px-3.5 py-1.5 rounded-lg border border-[#1d2b48] bg-[#121a2c] text-slate-300 hover:bg-[#18233c] text-xs transition-colors"
          >
            Policy Studio
          </Link>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: 6-Condition Gate Tester (§9) */}
        <div className="col-span-8 flex flex-col gap-5">
          <div className="bg-[#0e1526] border border-[#1d2a45] rounded-2xl p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h2 className="font-semibold text-base text-slate-100">
                  The 6-Condition Insight Gate (§9)
                </h2>
              </div>
              {gateData && (
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                    gateData.gateResult.register === "unhedged"
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                      : gateData.gateResult.register === "hedged"
                      ? "bg-amber-950 text-amber-300 border border-amber-700"
                      : "bg-rose-950 text-rose-300 border border-rose-800"
                  }`}
                >
                  {gateData.gateResult.register === "unhedged"
                    ? "✓ Gate Passed: Unhedged"
                    : gateData.gateResult.register === "hedged"
                    ? "✓ Gate Passed: Hedged"
                    : "✕ Gate Blocked (Silent)"}
                </span>
              )}
            </div>

            {/* Gate Checklist Indicators */}
            {gateData && (
              <div className="grid grid-cols-3 gap-3">
                <GateCheckItem
                  label="1. Posterior Probability"
                  requirement="p ≥ 0.75"
                  current={`p = ${posteriorProb.toFixed(2)}`}
                  passed={posteriorProb >= 0.75}
                />
                <GateCheckItem
                  label="2. Independent Observations"
                  requirement="Count ≥ 4"
                  current={`${obsCount} observed`}
                  passed={obsCount >= 4}
                />
                <GateCheckItem
                  label="3. Distinct Activity Types"
                  requirement="Types ≥ 2"
                  current={`${distinctActivities} type(s)`}
                  passed={distinctActivities >= 2}
                />
                <GateCheckItem
                  label="4. Distinct Sessions Spanned"
                  requirement="Sessions ≥ 2"
                  current={`${distinctSessions} session(s)`}
                  passed={distinctSessions >= 2}
                />
                <GateCheckItem
                  label="5. Counter-Hypothesis Probed"
                  requirement="Probed ≥ 1 time"
                  current={counterProbed ? "Probed" : "Unprobed"}
                  passed={counterProbed}
                />
                <GateCheckItem
                  label="6. Evaluator Confidence"
                  requirement="Each ≥ 0.70"
                  current={`min = ${evalConfidence.toFixed(2)}`}
                  passed={evalConfidence >= 0.7}
                />
              </div>
            )}

            {/* Phrasing Card if Passed */}
            {gateData?.phrasedInsight ? (
              <div className="p-4 rounded-xl bg-[#0b101d] border border-indigo-900/50 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-300">
                    Generated Phrasing ({gateData.gateResult.register.toUpperCase()} REGISTER)
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Code: {gateData.phrasedInsight.diagnosisCode}
                  </span>
                </div>
                <p className="text-sm font-serif italic text-slate-100 leading-relaxed bg-[#101728] p-3 rounded-lg border border-[#1b2844]">
                  "{gateData.phrasedInsight.text}"
                </p>
                <div className="text-[11px] text-slate-400">
                  {gateData.gateResult.register === "unhedged"
                    ? "Assertive register used because posterior confidence p ≥ 0.85."
                    : "Hedged register used (0.75 ≤ p < 0.85) inviting the learner into the probe reasoning."}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-[#0b101d] border border-rose-950 flex flex-col gap-1 text-xs text-rose-300">
                <span className="font-semibold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Insight Surfacing Suppressed by Gate
                </span>
                <ul className="list-disc pl-5 text-slate-400 text-[11px] flex flex-col gap-0.5 mt-1">
                  {gateData?.gateResult.reasonsBlocked.map((r: string, idx: number) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
                <p className="text-[10px] text-slate-500 mt-1 italic">
                  Observations that fail the gate are not discarded. They update the learner model silently (§9).
                </p>
              </div>
            )}

            {/* Interactive Gate Sliders & Controls */}
            <div className="pt-3 border-t border-[#1a253c] flex flex-col gap-4 text-xs">
              <span className="font-semibold text-slate-300">Adjust Candidate Parameters:</span>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <label className="text-slate-400">Posterior Probability (p):</label>
                    <span className="font-mono text-indigo-300">{posteriorProb.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.0"
                    step="0.01"
                    value={posteriorProb}
                    onChange={(e) => setPosteriorProb(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <label className="text-slate-400">Independent Observations:</label>
                    <span className="font-mono text-indigo-300">{obsCount}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    value={obsCount}
                    onChange={(e) => setObsCount(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 pt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">Diagnosis Code</label>
                  <select
                    value={diagnosisCode}
                    onChange={(e) => setDiagnosisCode(e.target.value)}
                    className="bg-[#121a2c] border border-[#1f2b47] rounded-lg px-2 py-1.5 text-slate-200"
                  >
                    <option value="PP.01">PP.01 (Beneficiary)</option>
                    <option value="PP.03">PP.03 (Cause vs Goal)</option>
                    <option value="PI.01">PI.01 (Scene Inversion)</option>
                    <option value="PI.06">PI.06 (Narrative Flattening)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">Activity Types</label>
                  <select
                    value={distinctActivities}
                    onChange={(e) => setDistinctActivities(parseInt(e.target.value))}
                    className="bg-[#121a2c] border border-[#1f2b47] rounded-lg px-2 py-1.5 text-slate-200"
                  >
                    <option value="1">1 Type Only (Blocks)</option>
                    <option value="2">2+ Types (Passes)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">Sessions Spanned</label>
                  <select
                    value={distinctSessions}
                    onChange={(e) => setDistinctSessions(parseInt(e.target.value))}
                    className="bg-[#121a2c] border border-[#1f2b47] rounded-lg px-2 py-1.5 text-slate-200"
                  >
                    <option value="1">1 Session (Cold Start Block)</option>
                    <option value="2">2+ Sessions (Passes)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">Counter-Probe</label>
                  <button
                    onClick={() => setCounterProbed(!counterProbed)}
                    className={`py-1.5 px-2 rounded-lg border font-medium text-xs transition-all ${
                      counterProbed
                        ? "bg-emerald-950 border-emerald-800 text-emerald-300"
                        : "bg-rose-950 border-rose-800 text-rose-300"
                    }`}
                  >
                    {counterProbed ? "Probed (Passes)" : "Unprobed (Blocks)"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Counter-Hypothesis Probing Deep Dive (§9, §26) */}
          <div className="bg-[#0e1526] border border-[#1d2a45] rounded-2xl p-5 flex flex-col gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <h3 className="font-semibold text-sm text-slate-200">
                Why Counter-Hypothesis Probing Matters Most (§9)
              </h3>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              "Before telling a learner they confuse beneficiary with purpose (PP.01), Glotty must have presented at least one item that would distinguish that hypothesis from the nearest alternative (PP.06: undifferentiated L1 'for' transfer) and observed the result. Without this, Glotty is pattern-matching rather than diagnosing, and it will be wrong in exactly the interesting cases."
            </p>
            <div className="p-3 bg-[#0a0f1c] rounded-xl border border-[#18233b] flex flex-col gap-1.5 font-mono text-[10px] text-slate-300">
              <span className="text-indigo-400 font-bold">The Distinguishing Probe for PP.01 vs PP.06:</span>
              <span>1. Lo hice ___ ti. (Beneficiary substitution)</span>
              <span>2. Trabajo ___ una empresa española. (Employment)</span>
              <span>3. Estudio español ___ hablar con mis clientes. (Purpose)</span>
              <span className="text-emerald-400 pt-1">
                PP.01 fails #1 while handling #3; PP.06 shows random erratic switching across all three.
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Wrong-Insight Budget & Circuit Breaker (§11) */}
        <div className="col-span-4 flex flex-col gap-5">
          {/* Circuit Breaker Health Card */}
          <div className="bg-[#0e1526] border border-[#1d2a45] rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-400" />
                <h3 className="font-semibold text-sm text-slate-200">
                  Wrong-Insight Budget (§11)
                </h3>
              </div>
              <button
                onClick={fetchMetrics}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                Refresh
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed text-[11px]">
              "Treated as a hard constraint, not a metric. Learner-rated wrong insights: ≤ 3% of surfaced insights. Breaching this halts insight surfacing immediately."
            </p>

            {feedbackMetrics && (
              <div className="flex flex-col gap-3">
                {/* Metric Bars */}
                <div className="p-3 rounded-xl bg-[#0a0f1c] border border-[#182339] flex flex-col gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Wrong Rating Rate:</span>
                    <span
                      className={`font-mono font-bold ${
                        feedbackMetrics.wrongRate > 3.0 ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {feedbackMetrics.wrongRate}% (Ceiling: ≤ 3.0%)
                    </span>
                  </div>
                  <div className="w-full bg-[#182338] h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        feedbackMetrics.wrongRate > 3.0 ? "bg-rose-500" : "bg-emerald-400"
                      }`}
                      style={{ width: `${Math.min(100, feedbackMetrics.wrongRate * 10)}%` }}
                    />
                  </div>

                  <div className="flex justify-between pt-1 border-t border-[#141d30]">
                    <span className="text-slate-400">Useful Rating Rate:</span>
                    <span className="font-mono font-bold text-indigo-400">
                      {feedbackMetrics.usefulRate}% (Target: ≥ 50%)
                    </span>
                  </div>
                </div>

                {/* Circuit Breaker Status Pill */}
                <div
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono ${
                    feedbackMetrics.circuitBreakerBreached
                      ? "bg-rose-950/70 border-rose-800 text-rose-300"
                      : "bg-emerald-950/50 border-emerald-800 text-emerald-300"
                  }`}
                >
                  <span>Circuit Breaker Status:</span>
                  <span className="font-bold uppercase">
                    {feedbackMetrics.circuitBreakerBreached ? "HALTED" : "HEALTHY"}
                  </span>
                </div>

                {/* Test Feedback Injector */}
                <div className="pt-2 border-t border-[#182339] flex flex-col gap-2 text-xs">
                  <span className="text-slate-400 font-medium">Inject Test Feedback into Postgres:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleInjectFeedback("useful")}
                      className="py-1.5 rounded-lg bg-[#141d30] hover:bg-[#1a2640] border border-[#222f49] text-emerald-300 flex items-center justify-center gap-1 transition-all"
                    >
                      <ThumbsUp className="w-3 h-3" /> Useful
                    </button>
                    <button
                      onClick={() => handleInjectFeedback("not_useful")}
                      className="py-1.5 rounded-lg bg-[#141d30] hover:bg-[#1a2640] border border-[#222f49] text-slate-300 flex items-center justify-center gap-1 transition-all"
                    >
                      <ThumbsDown className="w-3 h-3" /> Not Useful
                    </button>
                    <button
                      onClick={() => handleInjectFeedback("wrong")}
                      className="py-1.5 rounded-lg bg-[#141d30] hover:bg-rose-950/50 border border-[#222f49] hover:border-rose-800 text-rose-300 flex items-center justify-center gap-1 transition-all"
                    >
                      <AlertOctagon className="w-3 h-3" /> Wrong
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cold-Start Truth Card (§12) */}
          <div className="bg-[#0e1526] border border-[#1d2a45] rounded-2xl p-5 flex flex-col gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="font-semibold text-slate-200">The Cold-Start Rule (§12)</h3>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              "For roughly the first two sessions Glotty has almost no learner-specific evidence, and the gate will correctly block nearly everything. This must be designed for rather than papered over. Offer observations about the language, not the learner."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GateCheckItem({
  label,
  requirement,
  current,
  passed,
}: {
  label: string;
  requirement: string;
  current: string;
  passed: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-xl border flex flex-col gap-1 transition-all ${
        passed
          ? "bg-[#0b1424] border-[#1d3557]"
          : "bg-[#140c12] border-rose-950/80"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-medium truncate">{label}</span>
        {passed ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        ) : (
          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        )}
      </div>
      <span className="text-xs font-semibold text-slate-200">{requirement}</span>
      <span className="text-[10px] font-mono text-slate-500 pt-0.5 border-t border-slate-800/60">
        {current}
      </span>
    </div>
  );
}
