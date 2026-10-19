"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowLeft,
  Search,
  Sparkles,
  Info,
} from "lucide-react";

export default function EvaluatorStudio() {
  const [metrics, setMetrics] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loadingBenchmark, setLoadingBenchmark] = useState(false);

  // Interactive tester state
  const [testPrompt, setTestPrompt] = useState("Describe qué pasó.");
  const [testResponse, setTestResponse] = useState(
    "Ayer iba al supermercado y compré leche cuando me encontré con Juan."
  );
  const [testConcept, setTestConcept] = useState("es.gram.aspect.pret_imp");
  const [testingLive, setTestingLive] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    runBenchmark();
  }, []);

  const runBenchmark = async () => {
    setLoadingBenchmark(true);
    try {
      const res = await fetch("/api/evaluator/benchmark");
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
        setItems(data.items || []);
      }
    } catch (e) {
      console.error("Benchmark error:", e);
    } finally {
      setLoadingBenchmark(false);
    }
  };

  const handleRunLiveTest = async (responseToTest?: string, conceptToTest?: string) => {
    const text = responseToTest || testResponse;
    const concept = conceptToTest || testConcept;
    if (!text.trim()) return;

    setTestingLive(true);
    try {
      const res = await fetch("/api/evaluator/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: testPrompt,
          response: text,
          conceptId: concept,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(data);
      }
    } catch (e) {
      console.error("Test error:", e);
    } finally {
      setTestingLive(false);
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
                Evaluator Studio & Acceptance Gates (§21–§26)
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                Milestone 2
              </span>
            </div>
            <p className="text-xs text-slate-400">
              "The evaluator is built and measured first, before anything is built on top of it." — §21
            </p>
          </div>
        </div>

        <button
          onClick={runBenchmark}
          disabled={loadingBenchmark}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-medium text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-950 disabled:opacity-50"
        >
          <Play className={`w-4 h-4 ${loadingBenchmark ? "animate-spin" : ""}`} />
          <span>{loadingBenchmark ? "Evaluating Gold Set..." : "Re-run Acceptance Gates"}</span>
        </button>
      </div>

      {/* Acceptance Gates Cards */}
      {metrics && (
        <div className="grid grid-cols-5 gap-4">
          <MetricCard
            title="Precision on INCORRECT"
            value={`${(metrics.precisionOnIncorrect * 100).toFixed(1)}%`}
            target="≥ 95.0%"
            passed={metrics.gateDetails.precisionOnIncorrectPassed}
            note="Asymmetric by design: false accusation is trust-killing (§25)"
          />
          <MetricCard
            title="Binary Accuracy"
            value={`${(metrics.binaryAccuracy * 100).toFixed(1)}%`}
            target="≥ 90.0%"
            passed={metrics.gateDetails.binaryAccuracyPassed}
            note="Held-out gold standard evaluation"
          />
          <MetricCard
            title="Diagnosis Top-1"
            value={`${(metrics.diagnosisTop1Accuracy * 100).toFixed(1)}%`}
            target="≥ 65.0%"
            passed={metrics.gateDetails.diagnosisAccuracyPassed}
            note="Given incorrect, correct taxonomy code"
          />
          <MetricCard
            title="UNCERTAIN Rate"
            value={`${(metrics.uncertainRate * 100).toFixed(1)}%`}
            target="≤ 15.0%"
            passed={metrics.gateDetails.uncertainRatePassed}
            note="Abstention on ambiguous intent"
          />
          <MetricCard
            title="Sync p95 Latency"
            value={`${metrics.syncLatencyP95Ms.toFixed(2)}ms`}
            target="< 200ms"
            passed={metrics.gateDetails.latencyPassed}
            note="Strictly zero LLM calls on sync path"
          />
        </div>
      )}

      {/* Interactive Response Tester */}
      <div className="bg-[#0e1526] border border-[#1d2a45] rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h2 className="font-semibold text-base text-slate-200">
              Interactive Dual-Path Evaluator Tester
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Sync (&lt;200ms) + Async (Gemini 1.5 Flash)</span>
        </div>

        {/* Quick Test Presets */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Try edge cases:</span>
          <button
            onClick={() => {
              setTestConcept("es.gram.aspect.pret_imp");
              setTestResponse("Ayer iba al supermercado y compré leche cuando me encontré con Juan.");
              handleRunLiveTest(
                "Ayer iba al supermercado y compré leche cuando me encontré con Juan.",
                "es.gram.aspect.pret_imp"
              );
            }}
            className="px-2.5 py-1 rounded bg-[#162138] hover:bg-[#1d2b4a] text-slate-300 border border-[#253659] transition-colors"
          >
            Ayer iba y compré (Valid backgrounding)
          </button>
          <button
            onClick={() => {
              setTestConcept("es.gram.aspect.pret_imp");
              setTestResponse("Cuando fui joven, jugué al fútbol todos los días con mis amigos.");
              handleRunLiveTest(
                "Cuando fui joven, jugué al fútbol todos los días con mis amigos.",
                "es.gram.aspect.pret_imp"
              );
            }}
            className="px-2.5 py-1 rounded bg-[#162138] hover:bg-[#1d2b4a] text-slate-300 border border-[#253659] transition-colors"
          >
            Cuando fui joven... (PI.01)
          </button>
          <button
            onClick={() => {
              setTestConcept("es.sem.por_para");
              setTestResponse("Fui a la reunión para Carlos porque él estaba enfermo en cama.");
              handleRunLiveTest(
                "Fui a la reunión para Carlos porque él estaba enfermo en cama.",
                "es.sem.por_para"
              );
            }}
            className="px-2.5 py-1 rounded bg-[#162138] hover:bg-[#1d2b4a] text-slate-300 border border-[#253659] transition-colors"
          >
            Fui para Carlos... (PP.01 Beneficiary)
          </button>
          <button
            onClick={() => {
              setTestConcept("es.sem.por_para");
              setTestResponse("Le dije: muchas gracias para todo tu apoyo.");
              handleRunLiveTest(
                "Le dije: muchas gracias para todo tu apoyo.",
                "es.sem.por_para"
              );
            }}
            className="px-2.5 py-1 rounded bg-[#162138] hover:bg-[#1d2b4a] text-slate-300 border border-[#253659] transition-colors"
          >
            muchas gracias para... (PP.07 Fixed chunk)
          </button>
        </div>

        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-3 flex flex-col gap-1 text-xs">
            <label className="text-slate-400 font-medium">Concept Domain</label>
            <select
              value={testConcept}
              onChange={(e) => setTestConcept(e.target.value)}
              className="bg-[#131c30] border border-[#202d4a] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
            >
              <option value="es.gram.aspect.pret_imp">Preterite vs. Imperfect (Aspect)</option>
              <option value="es.sem.por_para">Por vs. Para (Prepositional Semantics)</option>
            </select>
          </div>

          <div className="col-span-7 flex flex-col gap-1 text-xs">
            <label className="text-slate-400 font-medium">Learner Response to Evaluate</label>
            <input
              type="text"
              value={testResponse}
              onChange={(e) => setTestResponse(e.target.value)}
              className="bg-[#131c30] border border-[#202d4a] rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="col-span-2">
            <button
              onClick={() => handleRunLiveTest()}
              disabled={testingLive}
              className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Evaluate</span>
            </button>
          </div>
        </div>

        {/* Live Test Results Side by Side */}
        {testResult && (
          <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-[#1b263e]">
            {/* Sync Path Result */}
            <div className="bg-[#0b101c] p-4 rounded-xl border border-[#1a253d] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-emerald-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> Synchronous Path
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Latency: {testResult.sync.latencyMs}ms (Budget: &lt;200ms)
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">Result:</span>
                <span className="font-semibold uppercase tracking-wider text-slate-200">
                  {testResult.sync.evaluation}
                </span>
                {testResult.sync.diagnosisCode && (
                  <span className="text-xs px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                    {testResult.sync.diagnosisCode}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Evaluator: {testResult.sync.evaluatorVersion} (zero network calls)
              </span>
            </div>

            {/* Async Path Result */}
            <div className="bg-[#0b101c] p-4 rounded-xl border border-[#1a253d] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-indigo-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Async Path (Gemini 1.5 Flash)
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Latency: {testResult.async.latencyMs}ms
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">Result:</span>
                <span
                  className={`font-semibold uppercase tracking-wider ${
                    testResult.async.evaluation === "correct"
                      ? "text-emerald-400"
                      : testResult.async.evaluation === "incorrect"
                      ? "text-rose-400"
                      : "text-amber-400"
                  }`}
                >
                  {testResult.async.evaluation}
                </span>
                {testResult.async.diagnosisCode && (
                  <span className="text-xs px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                    Misconception: {testResult.async.diagnosisCode}
                  </span>
                )}
                <span className="text-xs text-slate-400 font-mono">
                  Confidence: {(testResult.async.evalConfidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic bg-[#101726] p-2.5 rounded-lg border border-[#1d2a45]">
                "{testResult.async.rationale}"
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Gold Standard Items Table */}
      <div className="bg-[#0e1526] border border-[#1d2a45] rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="font-semibold text-base text-slate-200">
              Gold Standard Benchmark Dataset ({items.length} Annotated Items)
            </h2>
          </div>
          <span className="text-xs text-slate-400">Over-sampled for subtle edge cases (§24)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1b263e] text-slate-400 font-medium">
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Concept</th>
                <th className="py-2.5 px-3">Learner Utterance</th>
                <th className="py-2.5 px-3">Expected</th>
                <th className="py-2.5 px-3">Actual</th>
                <th className="py-2.5 px-3">Diagnosis</th>
                <th className="py-2.5 px-3">Linguistic Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#162035] text-slate-300">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-[#11192e] transition-colors">
                  <td className="py-2.5 px-3">
                    {it.passed ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-400 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" /> FAIL
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">{it.id}</td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-indigo-300">
                    {it.conceptId.replace("es.", "")}
                  </td>
                  <td className="py-2.5 px-3 max-w-[280px] truncate text-slate-200 font-serif">
                    "{it.response}"
                  </td>
                  <td className="py-2.5 px-3 uppercase font-mono font-medium">
                    {it.expectedEvaluation}
                  </td>
                  <td className="py-2.5 px-3 uppercase font-mono font-medium">
                    {it.actualEvaluation}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-amber-300">
                    {it.actualDiagnosis || "—"}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 max-w-[300px] truncate">
                    {it.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  target,
  passed,
  note,
}: {
  title: string;
  value: string;
  target: string;
  passed: boolean;
  note: string;
}) {
  return (
    <div className="bg-[#0e1526] p-4 rounded-xl border border-[#1d2a45] flex flex-col gap-2">
      <span className="text-xs text-slate-400">{title}</span>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            passed
              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
              : "bg-rose-950 text-rose-300 border border-rose-800"
          }`}
        >
          {passed ? "PASS" : "FAIL"}
        </span>
      </div>
      <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1 border-t border-[#18233c]">
        <span>Gate: {target}</span>
      </div>
      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{note}</p>
    </div>
  );
}
