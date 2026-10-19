"use client";

import React from "react";
import { History, X, Sparkles } from "lucide-react";

interface SessionSummary {
  id: string;
  sessionNumber: number;
  status: string;
  goal: string;
  startedAt: string;
  endedAt: string;
  summary?: {
    debriefSummary: string;
    nextSessionPreview: string;
  };
  surfacedInsights: Array<{
    id: string;
    code: string;
    hedged: boolean;
    text: string;
    confidence: number;
  }>;
  eventCount: number;
  evaluations: {
    correct: number;
    incorrect: number;
    uncertain: number;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionSummary[];
}

export function SessionHistoryModal({ isOpen, onClose, sessions }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full max-h-[85vh] p-5 text-slate-800 shadow-2xl flex flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-base text-slate-900">Session History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex flex-col gap-3 pr-0.5">
          {sessions.length > 0 ? (
            sessions.map((s) => (
              <div
                key={s.id}
                className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col gap-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-indigo-700">
                      Session {s.sessionNumber}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        s.status === "completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-indigo-100 text-indigo-800"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <span className="text-slate-500 text-[11px]">
                    {new Date(s.startedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>

                <div className="text-slate-700 text-xs font-medium">{s.goal}</div>

                {s.summary?.debriefSummary && (
                  <p className="text-slate-800 italic bg-white p-3 rounded-xl border border-slate-200/60 font-serif leading-relaxed">
                    "{s.summary.debriefSummary}"
                  </p>
                )}

                {s.surfacedInsights.length > 0 ? (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Observations:
                    </span>
                    {s.surfacedInsights.map((ins) => (
                      <div
                        key={ins.id}
                        className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 text-slate-800 italic"
                      >
                        "{ins.text}"
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">
                    Silent observation active • Observations accumulating
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">
              No sessions found. Start chatting to begin Session 1.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
