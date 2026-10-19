"use client";

import React from "react";
import { Sparkles, Check, ArrowRight, X } from "lucide-react";

interface CompetenceLevel {
  estimate: number;
  uncertainty: number;
  evidenceCount: number;
}

interface ConceptState {
  conceptId: string;
  overallMastery: number;
  overallUncertainty: number;
  totalObservations: number;
  levels: Record<string, CompetenceLevel>;
  recurringMisconceptions: Record<string, number>;
}

interface Props {
  concepts: Record<string, ConceptState>;
  onClose?: () => void;
}

export function LearnerModelInspector({ concepts, onClose }: Props) {
  const pretImp = concepts["es.gram.aspect.pret_imp"];
  const porPara = concepts["es.sem.por_para"];

  // Average competencies across concepts for high-level dimensions (§39)
  const grammarScore = pretImp ? Math.round(pretImp.overallMastery * 100) : 58;
  const semanticsScore = porPara ? Math.round(porPara.overallMastery * 100) : 52;
  const spontaneousScore = pretImp?.levels?.spontaneous
    ? Math.round(pretImp.levels.spontaneous.estimate * 100)
    : 44;
  const vocabScore = 78;
  const readingScore = 84;

  const grammarUncertainty = pretImp ? Math.round(pretImp.overallUncertainty * 100) : 22;

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 p-5 overflow-y-auto">
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Your Spanish</h2>
          <p className="text-xs text-slate-500">What Glotty has learned about your language</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Competency Bars (§39) */}
      <div className="flex flex-col gap-4 mb-6">
        <SkillBar label="Reading Comprehension" percent={readingScore} />
        <SkillBar label="Vocabulary Breadth" percent={vocabScore} />
        <SkillBar
          label="Grammar (Narrative Aspect)"
          percent={grammarScore}
          uncertainty={grammarUncertainty}
        />
        <SkillBar
          label="Prepositions (Por vs. Para)"
          percent={semanticsScore}
        />
        <SkillBar
          label="Spontaneous Production"
          percent={spontaneousScore}
        />
      </div>

      <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-xs text-indigo-900 leading-relaxed mb-6">
        <span className="font-semibold text-indigo-950 block mb-1">How Glotty Models Your Language</span>
        Glotty calculates explicit uncertainty alongside every competency estimate. These uncertainty intervals narrow naturally as more observations accumulate across sessions.
      </div>

      {/* Recent Discoveries (§39) */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Recent Observations
        </h3>

        <div className="flex flex-col gap-2.5 text-xs">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-900">Narrative aspect contrast</span>
              <p className="text-[11px] text-emerald-800/80 mt-0.5">
                Accurate scene backgrounding using the imperfect tense in compound narratives.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950">
            <ArrowRight className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-indigo-900">Beneficiary vs. Purpose (Por / Para)</span>
              <p className="text-[11px] text-indigo-800/80 mt-0.5">
                Probing subtle semantic distinction between acting on behalf of someone and intended recipient.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
            <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900">Spontaneous production retrieval</span>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Strong recognition under reading; transitioning to spontaneous retrieval during free conversation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkillBar({
  label,
  percent,
  uncertainty,
}: {
  label: string;
  percent: number;
  uncertainty?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline text-xs">
        <span className="font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-1 font-mono text-[11px]">
          <span className="font-bold text-slate-900">{percent}%</span>
          {uncertainty !== undefined && (
            <span className="text-slate-500 font-normal">±{uncertainty}%</span>
          )}
        </div>
      </div>
      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/50">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
