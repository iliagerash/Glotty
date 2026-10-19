"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  Layers,
  History,
  TrendingUp,
  Activity,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles,
  ShieldAlert,
} from "lucide-react";

export default function LearnerStudio() {
  const [profile, setProfile] = useState<any>(null);
  const [replaySteps, setReplaySteps] = useState<any[]>([]);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(-1);
  const [loading, setLoading] = useState(true);

  // Simulator state
  const [simConcept, setSimConcept] = useState("es.gram.aspect.pret_imp");
  const [simActivity, setSimActivity] = useState("conversation_turn");
  const [simEvaluation, setSimEvaluation] = useState("incorrect");
  const [simCode, setSimCode] = useState("PI.01");
  const [simResult, setSimResult] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch current profile
      const resProfile = await fetch("/api/learner/state?userId=usr_b1_learner_default");
      const dataProfile = await resProfile.json();
      if (dataProfile.success) {
        setProfile(dataProfile.profile);
      }

      // 2. Fetch replay steps
      const resReplay = await fetch("/api/learner/replay?userId=usr_b1_learner_default");
      const dataReplay = await resReplay.json();
      if (dataReplay.success) {
        setReplaySteps(dataReplay.steps || []);
        setSelectedStepIndex(dataReplay.steps.length - 1);
      }
    } catch (e) {
      console.error("Error loading learner data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const res = await fetch("/api/learner/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptId: simConcept,
          activityType: simActivity,
          exposureContext: simActivity.includes("conversation") ? "conversation" : "drill",
          evalConfidence: 0.9,
          evaluation: simEvaluation,
          diagnosisCode: simEvaluation === "incorrect" ? simCode : null,
          currentState: profile?.concepts?.[simConcept] || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSimResult(data);
      }
    } catch (e) {
      console.error("Error simulating update:", e);
    } finally {
      setSimulating(false);
    }
  };

  const currentReplayStep =
    selectedStepIndex >= 0 && replaySteps[selectedStepIndex]
      ? replaySteps[selectedStepIndex]
      : null;

  const displayConcepts = currentReplayStep
    ? currentReplayStep.statesSnapshot
    : profile?.concepts || {};

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
                Learner Model Studio & State Inspector (§13–§17, §35)
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                Milestone 3
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Probabilistic representations, 5 kinds of knowing, evidence weighting, and deterministic state replay.
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
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-medium text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-950 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh State</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Multidimensional State & 5 Kinds of Knowing */}
        <div className="col-span-8 flex flex-col gap-5">
          {/* Target Cluster 1: Aspect */}
          <ConceptDeepDiveCard
            title="Aspect: Preterite vs. Imperfect"
            conceptId="es.gram.aspect.pret_imp"
            state={displayConcepts["es.gram.aspect.pret_imp"]}
          />

          {/* Target Cluster 2: Por vs. Para */}
          <ConceptDeepDiveCard
            title="Prepositional Semantics: Por vs. Para"
            conceptId="es.sem.por_para"
            state={displayConcepts["es.sem.por_para"]}
          />

          {/* Section: Deterministic State Replay Timeline (§35) */}
          <div className="bg-[#0e1526] border border-[#1d2a45] rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                <h3 className="font-semibold text-sm text-slate-200">
                  Deterministic State Replay Timeline (§35)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {replaySteps.length} Historical Events in Postgres
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              "The learner model is a materialized view over the event log, not an authoritative record. Any learner's state at any past date must be reconstructible from events."
            </p>

            {replaySteps.length > 0 ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {replaySteps.map((s, idx) => (
                    <button
                      key={s.eventId}
                      onClick={() => setSelectedStepIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono shrink-0 transition-all border ${
                        selectedStepIndex === idx
                          ? "bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-950"
                          : "bg-[#141d30] border-[#222f49] text-slate-400 hover:bg-[#1a2640]"
                      }`}
                    >
                      Turn #{s.stepIndex} ({s.activityType})
                    </button>
                  ))}
                </div>

                {currentReplayStep && (
                  <div className="p-3.5 rounded-xl bg-[#0a0f1c] border border-[#192339] flex flex-col gap-2 text-xs">
                    <div className="flex items-center justify-between font-mono text-slate-400">
                      <span>Event: {currentReplayStep.eventId}</span>
                      <span>Weight: {currentReplayStep.evidenceWeight}</span>
                    </div>
                    <p className="text-slate-200 italic font-serif">
                      "{currentReplayStep.rawResponse}"
                    </p>
                    <div className="flex items-center gap-2 pt-1 border-t border-[#172033]">
                      <span className="text-slate-400">Eval: {currentReplayStep.evaluation}</span>
                      {currentReplayStep.diagnosisCode && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 font-mono text-[10px]">
                          Code: {currentReplayStep.diagnosisCode}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-[#0b101c] border border-[#19243a] text-xs text-slate-500 text-center">
                No events recorded yet. Start a session in the main interface to populate history.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Evidence Weighting Simulator (§16) & FSRS (§17) */}
        <div className="col-span-4 flex flex-col gap-5">
          {/* Simulator Box */}
          <div className="bg-[#0e1526] border border-[#1d2a45] rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <h3 className="font-semibold text-sm text-slate-200">
                Evidence Weighting Simulator (§16)
              </h3>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400">Target Concept</label>
                <select
                  value={simConcept}
                  onChange={(e) => setSimConcept(e.target.value)}
                  className="bg-[#121a2c] border border-[#1f2b47] rounded-lg px-2.5 py-2 text-slate-200"
                >
                  <option value="es.gram.aspect.pret_imp">Preterite vs. Imperfect</option>
                  <option value="es.sem.por_para">Por vs. Para</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">Activity Type & Exposure</label>
                <select
                  value={simActivity}
                  onChange={(e) => setSimActivity(e.target.value)}
                  className="bg-[#121a2c] border border-[#1f2b47] rounded-lg px-2.5 py-2 text-slate-200"
                >
                  <option value="conversation_turn">Free Conversation Turn (Weight: 0.4)</option>
                  <option value="diagnostic_item">Controlled Diagnostic Drill (Weight: 1.0)</option>
                  <option value="constrained_production">Constrained Production (Weight: 0.8)</option>
                  <option value="reading">Reading Comprehension (Weight: 0.6)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-400">Observed Outcome</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSimEvaluation("correct")}
                    className={`py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      simEvaluation === "correct"
                        ? "bg-emerald-950 border-emerald-700 text-emerald-300"
                        : "bg-[#121a2c] border-[#1f2b47] text-slate-400"
                    }`}
                  >
                    Correct
                  </button>
                  <button
                    onClick={() => setSimEvaluation("incorrect")}
                    className={`py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      simEvaluation === "incorrect"
                        ? "bg-rose-950 border-rose-700 text-rose-300"
                        : "bg-[#121a2c] border-[#1f2b47] text-slate-400"
                    }`}
                  >
                    Incorrect
                  </button>
                </div>
              </div>

              {simEvaluation === "incorrect" && (
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">Misconception Code</label>
                  <select
                    value={simCode}
                    onChange={(e) => setSimCode(e.target.value)}
                    className="bg-[#121a2c] border border-[#1f2b47] rounded-lg px-2.5 py-2 text-slate-200 font-mono"
                  >
                    <option value="PI.01">PI.01 — Background/foreground inversion</option>
                    <option value="PI.02">PI.02 — Lexical trigger overgeneralization</option>
                    <option value="PI.06">PI.06 — Narrative flattening</option>
                    <option value="PP.01">PP.01 — Beneficiary vs purpose</option>
                    <option value="PP.07">PP.07 — Fixed expression corrupted</option>
                  </select>
                </div>
              )}

              <button
                onClick={handleSimulate}
                disabled={simulating}
                className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-medium transition-all mt-1"
              >
                {simulating ? "Simulating..." : "Compute Bayesian Update"}
              </button>
            </div>

            {/* Simulation Results */}
            {simResult && (
              <div className="p-3.5 rounded-xl bg-[#0a0f1c] border border-[#192339] flex flex-col gap-2.5 text-xs">
                <div className="flex items-center justify-between font-medium text-slate-200">
                  <span>Applied Evidence Weight:</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {simResult.evidenceWeight.toFixed(1)}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {simResult.weightRationale}
                </p>

                <div className="pt-2 border-t border-[#172033] flex flex-col gap-1 text-[11px]">
                  <div className="flex justify-between text-slate-300">
                    <span>New Overall Mastery:</span>
                    <span className="font-semibold text-indigo-400">
                      {(simResult.updatedState.overallMastery * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>New Uncertainty:</span>
                    <span className="font-mono text-slate-400">
                      ±{(simResult.updatedState.overallUncertainty * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>FSRS Next Interval:</span>
                    <span className="font-semibold text-emerald-400">
                      {simResult.fsrs.nextIntervalDays} day(s)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Monotonicity Card (§14) */}
          <div className="bg-[#0e1526] border border-[#1d2a45] rounded-2xl p-5 flex flex-col gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-400" />
              <h3 className="font-semibold text-slate-200">The Monotonicity Rule (§14)</h3>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              "Production implies recall implies recognition. This is not a simplification — it is a monotonicity assumption that materially reduces free parameters and stabilizes estimates under sparse data."
            </p>
            <div className="p-2.5 bg-[#0a0f1c] rounded-lg border border-[#1a253c] font-mono text-[10px] text-indigo-300 text-center">
              Spontaneous ≤ Production ≤ Recall ≤ Contextual ≤ Recognition
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConceptDeepDiveCard({
  title,
  conceptId,
  state,
}: {
  title: string;
  conceptId: string;
  state?: any;
}) {
  const mastery = state ? Math.round(state.overallMastery * 100) : 50;
  const uncertainty = state ? Math.round(state.overallUncertainty * 100) : 25;
  const obsCount = state ? state.totalObservations : 0;
  const levels = state?.levels;

  return (
    <div className="bg-[#0e1526] border border-[#1d2a45] rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-base text-slate-100">{title}</h2>
          <span className="text-xs font-mono text-slate-500">{conceptId}</span>
        </div>
        <div className="text-right">
          <span className="text-xl font-bold text-indigo-400">{mastery}%</span>
          <span className="text-xs font-mono text-slate-400 block">
            ±{uncertainty}% uncertainty ({obsCount} observations)
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#162137] h-2.5 rounded-full overflow-hidden">
        <div
          className="bg-indigo-500 h-full rounded-full transition-all duration-500"
          style={{ width: `${mastery}%` }}
        />
      </div>

      {/* 5 Ordered Competence Levels (§14) */}
      <div className="grid grid-cols-5 gap-3 pt-2">
        <LevelCard label="1. Recognition" level={levels?.recognition} prior="70%" />
        <LevelCard label="2. Contextual" level={levels?.contextual} prior="60%" />
        <LevelCard label="3. Recall" level={levels?.recall} prior="50%" />
        <LevelCard label="4. Production" level={levels?.production} prior="40%" />
        <LevelCard label="5. Spontaneous" level={levels?.spontaneous} prior="30%" />
      </div>

      {/* Recurring Misconceptions (§13) */}
      {state && Object.keys(state.recurringMisconceptions || {}).length > 0 && (
        <div className="pt-3 border-t border-[#18233c] flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Logged Misconceptions:</span>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(state.recurringMisconceptions).map(([code, cnt]) => (
              <span
                key={code}
                className="text-xs px-2 py-0.5 rounded bg-rose-950/70 text-rose-300 border border-rose-900/50 font-mono"
              >
                {code} (x{cnt as number})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LevelCard({ label, level, prior }: { label: string; level?: any; prior: string }) {
  const estimate = level ? Math.round(level.estimate * 100) : parseInt(prior);
  const uncertainty = level ? Math.round(level.uncertainty * 100) : 25;
  const count = level ? level.evidenceCount : 0;

  return (
    <div className="p-3 rounded-xl bg-[#0a0f1c] border border-[#19243c] flex flex-col gap-1.5 text-xs">
      <span className="text-slate-400 font-medium truncate">{label}</span>
      <div className="flex items-baseline justify-between">
        <span className="text-base font-bold text-slate-100">{estimate}%</span>
        <span className="text-[10px] font-mono text-slate-500">±{uncertainty}%</span>
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-[#141d30]">
        <span>Obs: {count}</span>
        <span>Prior: {prior}</span>
      </div>
    </div>
  );
}
