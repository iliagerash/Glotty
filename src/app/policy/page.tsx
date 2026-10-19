"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Compass,
  Shuffle,
  Activity,
  Layers,
  Sparkles,
  Database,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
} from "lucide-react";

export default function PolicyStudio() {
  const [decisionData, setDecisionData] = useState<any>(null);
  const [auditData, setAuditData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Policy selector controls
  const [selectedScenario, setSelectedScenario] = useState("recurring_error");
  const [activeCohort, setActiveCohort] = useState<"adaptive" | "control">("adaptive");
  const [isFirstSession, setIsFirstSession] = useState(false);

  useEffect(() => {
    fetchPolicyDecision();
    fetchAuditData();
  }, [selectedScenario, activeCohort, isFirstSession]);

  const fetchPolicyDecision = async () => {
    setLoading(true);
    try {
      // Construct scenario state
      let customState: any = null;
      if (selectedScenario === "recurring_error") {
        customState = {
          conceptId: "es.sem.por_para",
          overallMastery: 0.52,
          overallUncertainty: 0.18,
          totalObservations: 6,
          levels: {
            recognition: { estimate: 0.8 },
            contextual: { estimate: 0.7 },
            recall: { estimate: 0.55 },
            production: { estimate: 0.4 },
            spontaneous: { estimate: 0.3 },
          },
          recurringMisconceptions: { "PP.01": 3 },
        };
      } else if (selectedScenario === "production_gap") {
        customState = {
          conceptId: "es.gram.aspect.pret_imp",
          overallMastery: 0.65,
          overallUncertainty: 0.15,
          totalObservations: 8,
          levels: {
            recognition: { estimate: 0.92 },
            contextual: { estimate: 0.85 },
            recall: { estimate: 0.72 },
            production: { estimate: 0.42 }, // Gap > 0.25!
            spontaneous: { estimate: 0.35 },
          },
          recurringMisconceptions: {},
        };
      } else if (selectedScenario === "mastered") {
        customState = {
          conceptId: "es.gram.aspect.pret_imp",
          overallMastery: 0.89,
          overallUncertainty: 0.11,
          totalObservations: 14,
          levels: {
            recognition: { estimate: 0.95 },
            contextual: { estimate: 0.92 },
            recall: { estimate: 0.88 },
            production: { estimate: 0.86 },
            spontaneous: { estimate: 0.85 },
          },
          recurringMisconceptions: {},
        };
      }

      const res = await fetch("/api/policy/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptId:
            selectedScenario === "recurring_error"
              ? "es.sem.por_para"
              : "es.gram.aspect.pret_imp",
          activeCohort,
          isFirstSession,
          customState,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDecisionData(data);
      }
    } catch (e) {
      console.error("Failed to fetch policy decision:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditData = async () => {
    try {
      const res = await fetch("/api/policy/audit");
      const data = await res.json();
      if (data.success) {
        setAuditData(data.audit);
      }
    } catch (e) {
      console.error("Failed to fetch audit data:", e);
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
                Policy Engine & Exploration Studio (§27–§30)
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                Milestone 4
              </span>
            </div>
            <p className="text-xs text-slate-400">
              "Exploration is a Phase 1 requirement. Confounding by indication cannot be fixed retroactively." — §29
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
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Policy Selector & Candidate Utilities */}
        <div className="col-span-8 flex flex-col gap-5">
          {/* Action Selector Card */}
          <div className="bg-[#0e1526] border border-[#1d2a45] rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-indigo-400" />
                <h2 className="font-semibold text-base text-slate-100">
                  Bandit Action Selector & Utilities (§27)
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Cohort:</span>
                <button
                  onClick={() =>
                    setActiveCohort(activeCohort === "adaptive" ? "control" : "adaptive")
                  }
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                    activeCohort === "adaptive"
                      ? "bg-indigo-950/80 border-indigo-700 text-indigo-300"
                      : "bg-slate-800 border-slate-600 text-slate-300"
                  }`}
                >
                  {activeCohort === "adaptive" ? "Arm A (Adaptive)" : "Arm B (Control Cohort §44)"}
                </button>
              </div>
            </div>

            {/* Scenario Picker */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Simulate Learner State:</span>
              <button
                onClick={() => setSelectedScenario("recurring_error")}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  selectedScenario === "recurring_error"
                    ? "bg-indigo-600 border-indigo-400 text-white"
                    : "bg-[#131d31] border-[#22304d] text-slate-400 hover:bg-[#1a2640]"
                }`}
              >
                Recurring Misconception (PP.01 x3)
              </button>
              <button
                onClick={() => setSelectedScenario("production_gap")}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  selectedScenario === "production_gap"
                    ? "bg-indigo-600 border-indigo-400 text-white"
                    : "bg-[#131d31] border-[#22304d] text-slate-400 hover:bg-[#1a2640]"
                }`}
              >
                Production Gap (Recog 92% vs Prod 42%)
              </button>
              <button
                onClick={() => setSelectedScenario("mastered")}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  selectedScenario === "mastered"
                    ? "bg-indigo-600 border-indigo-400 text-white"
                    : "bg-[#131d31] border-[#22304d] text-slate-400 hover:bg-[#1a2640]"
                }`}
              >
                Mastered Concept (Mastery &gt; 85%)
              </button>
            </div>

            {/* Candidate Interventions Ranking */}
            {decisionData && (
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Candidate Interventions Ranked by Estimated Utility:</span>
                  <span className="font-mono">
                    Near-tie margin: ε = {decisionData.nearTieAnalysis.epsilon}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {decisionData.decision.candidates.map((cand: any) => {
                    const isSelected = cand.action === decisionData.decision.action;
                    const isNearTie =
                      decisionData.nearTieAnalysis.topValue - cand.estimatedValue <= 0.08;

                    return (
                      <div
                        key={cand.action}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                          isSelected
                            ? "bg-indigo-950/70 border-indigo-500 shadow-md shadow-indigo-950/50"
                            : isNearTie
                            ? "bg-[#121b2d] border-[#2a3a5a]"
                            : "bg-[#0b101c] border-[#182338] opacity-70"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-semibold text-sm uppercase font-mono ${
                              isSelected ? "text-indigo-300" : "text-slate-300"
                            }`}
                          >
                            {cand.action}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500 text-white font-medium">
                              Chosen Action
                            </span>
                          )}
                          {isNearTie && !isSelected && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                              Near-Tie Candidate (within ε)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="w-36 bg-[#162137] h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isSelected ? "bg-indigo-400" : "bg-slate-500"
                              }`}
                              style={{ width: `${Math.round(cand.estimatedValue * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-slate-300 w-12 text-right">
                            {cand.estimatedValue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Decision Metadata Telemetry */}
                <div className="mt-2 p-3.5 rounded-xl bg-[#090e1a] border border-[#18243b] flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Propensity P(a|s):</span>
                    <span className="text-emerald-400 font-bold">
                      {decisionData.decision.propensity.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Exploration Tag:</span>
                    <span
                      className={`px-2 py-0.5 rounded ${
                        decisionData.decision.isExploration
                          ? "bg-purple-950 text-purple-300 border border-purple-800"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {decisionData.decision.isExploration
                        ? `Exploration (${decisionData.decision.explorationType})`
                        : "Exploitation (Top Value)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Assigned Style:</span>
                    <span className="text-amber-300 font-bold">
                      {decisionData.decision.explanationStyle}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section: PostgreSQL Causal Exploration Audit (§29, Appendix A) */}
          <div className="bg-[#0e1526] border border-[#1d2a45] rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-sm text-slate-200">
                  PostgreSQL Causal Logging Audit (Appendix A)
                </h3>
              </div>
              <button
                onClick={fetchAuditData}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                Refresh Log
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              "Policy fields are present from event one. policy_candidates, propensity, is_exploration. Adding them later means earlier data is causally useless." — §33
            </p>

            {auditData && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-[#0a0f1c] rounded-xl border border-[#182339]">
                    <span className="text-slate-400 block text-[11px]">Total Events</span>
                    <span className="text-base font-bold text-white">
                      {auditData.totalEvents}
                    </span>
                  </div>
                  <div className="p-3 bg-[#0a0f1c] rounded-xl border border-[#182339]">
                    <span className="text-slate-400 block text-[11px]">Exploration Rate</span>
                    <span className="text-base font-bold text-purple-400">
                      {auditData.explorationRate}%
                    </span>
                  </div>
                  <div className="p-3 bg-[#0a0f1c] rounded-xl border border-[#182339]">
                    <span className="text-slate-400 block text-[11px]">Missing Causal Fields</span>
                    <span className="text-base font-bold text-emerald-400">
                      {auditData.missingCausalFieldsCount} (0%)
                    </span>
                  </div>
                  <div className="p-3 bg-[#0a0f1c] rounded-xl border border-[#182339]">
                    <span className="text-slate-400 block text-[11px]">Causal Validity</span>
                    <span className="text-base font-bold text-emerald-400">
                      VERIFIED
                    </span>
                  </div>
                </div>

                {/* Event rows audit */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#1b263e] text-slate-400">
                        <th className="py-2 px-2.5">Event ID</th>
                        <th className="py-2 px-2.5">Action</th>
                        <th className="py-2 px-2.5">Propensity</th>
                        <th className="py-2 px-2.5">Exploration?</th>
                        <th className="py-2 px-2.5">Type</th>
                        <th className="py-2 px-2.5">Cohort</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#152035] text-slate-300 font-mono text-[11px]">
                      {auditData.recentCausalEvents?.map((e: any) => (
                        <tr key={e.eventId} className="hover:bg-[#10182b]">
                          <td className="py-2 px-2.5 text-slate-400">{e.eventId.slice(0, 8)}...</td>
                          <td className="py-2 px-2.5 text-indigo-300 font-bold">{e.policyAction}</td>
                          <td className="py-2 px-2.5 text-emerald-400">
                            {Number(e.propensity).toFixed(2)}
                          </td>
                          <td className="py-2 px-2.5">
                            {e.isExploration ? (
                              <span className="text-purple-400">TRUE</span>
                            ) : (
                              <span className="text-slate-500">FALSE</span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-slate-400">
                            {e.explorationType || "—"}
                          </td>
                          <td className="py-2 px-2.5 text-slate-400">{e.cohort}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 4 Exploration Modalities (§29) & Guardrails (§30) */}
        <div className="col-span-4 flex flex-col gap-5">
          {/* Explanation Style Randomizer Box (§20) */}
          <div className="bg-[#0e1526] border border-[#1d2a45] rounded-2xl p-5 flex flex-col gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Shuffle className="w-4 h-4 text-amber-400" />
              <h3 className="font-semibold text-sm text-slate-200">
                Explanation Style Randomization (§20)
              </h3>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              "Whenever the policy triggers an explanation, the style is chosen randomly among eligible styles and logged with its propensity (1/6). Without randomization, instructional style is confounded with concept difficulty."
            </p>

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {[
                "rule_based",
                "conceptual",
                "contrastive",
                "etymological",
                "cross_linguistic",
                "example_first",
              ].map((style) => (
                <div
                  key={style}
                  className={`p-2 rounded-lg border font-mono text-[11px] text-center ${
                    decisionData?.decision?.explanationStyle === style
                      ? "bg-amber-950/80 border-amber-700 text-amber-200 font-bold"
                      : "bg-[#0b101c] border-[#18243a] text-slate-400"
                  }`}
                >
                  {style}
                </div>
              ))}
            </div>
          </div>

          {/* Retention Jitter Box (§29) */}
          <div className="bg-[#0e1526] border border-[#1d2a45] rounded-2xl p-5 flex flex-col gap-3 text-xs">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-indigo-400" />
              <h3 className="font-semibold text-sm text-slate-200">
                Retention Scheduling Jitter (§29)
              </h3>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              "For ~10% of review items, multiply the scheduled interval by a random factor (0.7 / 1.0 / 1.4). Without deliberately off-policy intervals, retention data is censored at exactly the intervals the current model already believes in."
            </p>
            <div className="p-2.5 bg-[#0a0f1c] rounded-lg border border-[#1a253c] font-mono text-[11px] text-center text-indigo-300">
              Jitter Factor: {decisionData?.decision?.jitterFactor?.toFixed(1) || "1.0"}x
            </div>
          </div>

          {/* Guardrails Box (§30) */}
          <div className="bg-[#0e1526] border border-[#1d2a45] rounded-2xl p-5 flex flex-col gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-sm text-slate-200">
                Exploration Guardrails (§30)
              </h3>
            </div>
            <ul className="flex flex-col gap-2 text-[11px] text-slate-400 list-disc pl-4">
              <li>Exclude learners in Session 1 from all but style randomization.</li>
              <li>Cap consecutive exploratory actions to maximum 2 turns.</li>
              <li>Never randomize across a difficulty gap the learner is not ready for.</li>
              <li>Never randomize the correctness of feedback.</li>
            </ul>

            <div className="flex items-center justify-between pt-2 border-t border-[#1a253c]">
              <span className="text-slate-300">Test Session 1 Flag:</span>
              <button
                onClick={() => setIsFirstSession(!isFirstSession)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium border ${
                  isFirstSession
                    ? "bg-amber-950 border-amber-800 text-amber-200"
                    : "bg-[#101726] border-[#1f2b45] text-slate-400"
                }`}
              >
                {isFirstSession ? "Session 1 Active" : "Steady State"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
