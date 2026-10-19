"use client";

import React, { useState } from "react";
import { Sparkles, ThumbsUp, ThumbsDown, AlertCircle, ArrowRight, X } from "lucide-react";

interface InsightItem {
  id: string;
  code: string;
  hedged: boolean;
  text: string;
  confidence: number;
}

interface Props {
  isOpen: boolean;
  sessionId: string;
  sessionNumber: number;
  debriefSummary: string;
  nextSessionPreview: string;
  insights: InsightItem[];
  onClose: () => void;
  onStartNextSession: () => void;
}

export function PostSessionModal({
  isOpen,
  sessionId,
  sessionNumber,
  debriefSummary,
  nextSessionPreview,
  insights,
  onClose,
  onStartNextSession,
}: Props) {
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, string>>({});
  const [circuitBreakerWarning, setCircuitBreakerWarning] = useState(false);

  if (!isOpen) return null;

  const handleFeedback = async (code: string, rating: "useful" | "not_useful" | "wrong") => {
    try {
      setFeedbackGiven((prev) => ({ ...prev, [code]: rating }));
      const res = await fetch("/api/insights/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          diagnosisCode: code,
          rating,
        }),
      });
      const data = await res.json();
      if (data.circuitBreakerBreached) {
        setCircuitBreakerWarning(true);
      }
    } catch (e) {
      console.error("Failed to submit feedback:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-slate-800 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">
                Session {sessionNumber} Review
              </h2>
              <p className="text-xs text-slate-500">Glotty pays attention</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Debrief Summary */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-sm leading-relaxed text-slate-700">
          <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-1.5">
            What I Noticed
          </h3>
          <p className="text-slate-800">{debriefSummary}</p>
        </div>

        {/* Earned Insights or Cold Start note */}
        {insights.length > 0 ? (
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Specific Observations
            </h4>
            {insights.map((ins) => (
              <div
                key={ins.id}
                className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-3"
              >
                <p className="text-sm text-slate-900 font-serif leading-relaxed italic">
                  "{ins.text}"
                </p>

                {/* Feedback buttons */}
                <div className="pt-2.5 border-t border-slate-200/80 flex flex-col gap-2">
                  <span className="text-[11px] text-slate-500">Does this match your experience?</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleFeedback(ins.code, "useful")}
                      disabled={!!feedbackGiven[ins.code]}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                        feedbackGiven[ins.code] === "useful"
                          ? "bg-emerald-600 text-white"
                          : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" /> Useful
                    </button>
                    <button
                      onClick={() => handleFeedback(ins.code, "not_useful")}
                      disabled={!!feedbackGiven[ins.code]}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                        feedbackGiven[ins.code] === "not_useful"
                          ? "bg-slate-700 text-white"
                          : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" /> Not useful
                    </button>
                    <button
                      onClick={() => handleFeedback(ins.code, "wrong")}
                      disabled={!!feedbackGiven[ins.code]}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                        feedbackGiven[ins.code] === "wrong"
                          ? "bg-rose-600 text-white"
                          : "bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-700 border border-slate-200"
                      }`}
                    >
                      <AlertCircle className="w-3.5 h-3.5" /> This is wrong
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-100 text-xs text-indigo-950 leading-relaxed">
            <span className="font-semibold block mb-1">Building Your Profile</span>
            Glotty is currently gathering observations about your Spanish. After two or three conversations, specific diagnostic insights will begin appearing here.
          </div>
        )}

        {circuitBreakerWarning && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>Observations have been paused for review to recalibrate accuracy.</span>
          </div>
        )}

        {/* Next Session Preview */}
        <div className="border-t border-slate-100 pt-3 flex flex-col gap-1 text-xs">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
            Plan for Next Session
          </span>
          <p className="text-slate-700 leading-relaxed">{nextSessionPreview}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700 transition-colors"
          >
            Review Chat
          </button>
          <button
            onClick={onStartNextSession}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-indigo-200"
          >
            Next Session <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
