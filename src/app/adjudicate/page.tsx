"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Evaluation = "correct" | "incorrect" | "uncertain" | "not_applicable";

interface Side {
  source: string;
  evaluation: Evaluation;
  diagnosis_code: string | null;
  note: string;
}

interface Decision {
  evaluation: Evaluation;
  diagnosis_code: string | null;
  contested?: boolean;
  rule?: string;
  chose?: string;
  confidence: 1 | 2 | 3;
  notes?: string;
}

interface Dispute {
  id: string;
  prompt: string;
  response: string;
  sides: [Side, Side];
  decision: Decision | null;
}

interface Rule {
  id: string;
  cluster: string;
  rule: string;
  examples: string[];
}

interface Code {
  code: string;
  name: string;
  domain: string;
  definition: string;
  positive_examples: string[];
  negative_examples: string[];
}

const LABELS: Record<Evaluation, string> = {
  correct: "Correct",
  incorrect: "Incorrect",
  uncertain: "Ambiguous",
  not_applicable: "N/A",
};

const CLUSTER_NAMES: Record<string, string> = {
  "es.gram.aspect.pret_imp": "Preterite / imperfect",
  "es.sem.por_para": "Por / para",
  all: "Either",
};

type Choice = "A" | "B" | "other" | "contested";

function store(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export default function AdjudicatePage() {
  const [adjudicator, setAdjudicator] = useState("");
  const [modelName, setModelName] = useState("chatgpt-v2");
  const [started, setStarted] = useState(false);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [taxonomy, setTaxonomy] = useState<Code[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [choice, setChoice] = useState<Choice | null>(null);
  const [otherEval, setOtherEval] = useState<Evaluation>("correct");
  const [otherCode, setOtherCode] = useState<string | null>(null);
  const [rule, setRule] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<1 | 2 | 3>(2);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAdjudicator(store("glotty.annotator") ?? "");
    setModelName(store("glotty.adjudicate.model") ?? "chatgpt-v2");
  }, []);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(
      `/api/gold/disputes?adjudicator=${encodeURIComponent(adjudicator)}&model=${encodeURIComponent(modelName)}`,
    );
    const body = await res.json();
    if (!res.ok) return setError(body.error);
    setDisputes(body.disputes);
    setRules(body.rules);
    setTaxonomy(body.taxonomy);
    const firstOpen = body.disputes.findIndex((d: Dispute) => !d.decision);
    setIndex(firstOpen === -1 ? 0 : firstOpen);
    setStarted(true);
  }, [adjudicator, modelName]);

  const d = disputes[index];

  // Load an existing decision into the form when moving between items.
  useEffect(() => {
    if (!d) return;
    const dec = d.decision;
    setRule(dec?.rule ?? null);
    setConfidence(dec?.confidence ?? 2);
    setNotes(dec?.notes ?? "");
    if (!dec) {
      setChoice(null);
      setOtherEval("correct");
      setOtherCode(null);
    } else if (dec.contested) {
      setChoice("contested");
    } else {
      const match = d.sides.findIndex(
        (s) => s.evaluation === dec.evaluation && (dec.evaluation !== "incorrect" || s.diagnosis_code === dec.diagnosis_code),
      );
      setChoice(match === 0 ? "A" : match === 1 ? "B" : "other");
      setOtherEval(dec.evaluation);
      setOtherCode(dec.diagnosis_code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d?.id]);

  // Reference material: the codes either side used, and the rules of the clusters involved.
  const codes = useMemo(() => {
    if (!d) return [];
    const wanted = new Set([...d.sides.map((s) => s.diagnosis_code), choice === "other" ? otherCode : null].filter(Boolean));
    return taxonomy.filter((c) => wanted.has(c.code));
  }, [d, taxonomy, choice, otherCode]);
  const clusterRules = useMemo(() => {
    const clusters = new Set(codes.map((c) => c.domain).filter((x) => x !== "all"));
    const show = clusters.size ? clusters : new Set(["es.gram.aspect.pret_imp", "es.sem.por_para"]);
    return rules.filter((r) => show.has(r.cluster) || r.cluster === "all");
  }, [codes, rules]);
  const otherRules = rules.filter((r) => !clusterRules.includes(r));

  const decided = disputes.filter((x) => x.decision).length;
  const pick = choice === "A" ? d?.sides[0] : choice === "B" ? d?.sides[1] : null;
  const evaluation: Evaluation | null = pick ? pick.evaluation : choice === "other" ? otherEval : choice === "contested" ? "uncertain" : null;
  const code = pick ? pick.diagnosis_code : choice === "other" && otherEval === "incorrect" ? otherCode : null;
  const canSave =
    !!d && choice !== null && (choice === "contested" || (rule !== null && (evaluation !== "incorrect" || code !== null)));

  const save = useCallback(async () => {
    if (!d || !canSave || saving) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/gold/disputes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adjudicator,
        item_id: d.id,
        contested: choice === "contested",
        evaluation,
        diagnosis_code: code,
        confidence,
        rule: choice === "contested" ? null : rule,
        chose: pick ? pick.source : choice === "contested" ? "contested" : "other",
        notes,
      }),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok) return setError(body.error);
    const next = disputes.map((x) => (x.id === d.id ? { ...x, decision: body.adjudication } : x));
    setDisputes(next);
    const after = next.findIndex((x, j) => j > index && !x.decision);
    const wrap = next.findIndex((x) => !x.decision);
    setIndex(after !== -1 ? after : wrap !== -1 ? wrap : Math.min(index + 1, next.length - 1));
  }, [d, canSave, saving, adjudicator, choice, evaluation, code, confidence, rule, pick, notes, disputes, index]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && (t as HTMLInputElement).type === "text")) return;
      if (t.tagName === "SELECT") return;
      if (e.key === "a" || e.key === "A") setChoice("A");
      else if (e.key === "b" || e.key === "B") setChoice("B");
      else if (e.key === "Enter") save();
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, disputes.length - 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, disputes.length]);

  if (!started) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-semibold">Adjudicate disputed labels</h1>
        <p className="mt-2 text-sm text-slate-600">
          Items where your label and a model&apos;s label disagree. Decide each one by the rule that settles it. If no rule
          does, mark it contested and it stays out of gold. Decisions are saved with your name.
        </p>
        <form
          className="mt-6 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const name = adjudicator.trim().toLowerCase();
            if (!/^[a-z0-9_-]{1,40}$/.test(name)) return setError("Name: use a-z, 0-9, _ or -");
            store("glotty.annotator", name);
            store("glotty.adjudicate.model", modelName.trim());
            setAdjudicator(name);
            load();
          }}
        >
          <input
            className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2"
            placeholder="Your name"
            value={adjudicator}
            onChange={(e) => setAdjudicator(e.target.value)}
          />
          <input
            className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2"
            placeholder="Model label set, e.g. chatgpt-v2"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
          />
          <button className="rounded-sm bg-slate-900 px-4 py-2 text-white">Start</button>
        </form>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </main>
    );
  }

  if (!d) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-xl font-semibold">No disputes</h1>
        <p className="mt-2 text-sm text-slate-600">Every item where both labels exist agrees.</p>
      </main>
    );
  }

  const button = (active: boolean) =>
    `rounded-sm border px-3 py-2 text-left text-sm ${active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white hover:bg-slate-50"}`;
  const codeName = (c: string | null) => (c ? `${c} ${taxonomy.find((t) => t.code === c)?.name ?? ""}` : "");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">Adjudicate</h1>
        <div className="text-sm text-slate-600">
          {adjudicator} vs {modelName} · {decided} / {disputes.length} decided
        </div>
      </header>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-sm bg-slate-200">
        <div className="h-full bg-slate-700" style={{ width: `${(100 * decided) / disputes.length}%` }} />
      </div>
      {error && <p className="mt-4 rounded-sm bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            #{index + 1} · {d.id} {d.decision && <span className="ml-1 rounded-sm bg-slate-100 px-1.5 py-0.5">decided</span>}
          </span>
          <span>
            <button className="px-2 hover:underline" onClick={() => setIndex(Math.max(index - 1, 0))}>
              ← prev
            </button>
            <button className="px-2 hover:underline" onClick={() => setIndex(Math.min(index + 1, disputes.length - 1))}>
              next →
            </button>
          </span>
        </div>
        {d.prompt && <p className="mt-3 text-sm italic text-slate-600">Tutor: {d.prompt}</p>}
        <p className="mt-2 text-lg leading-relaxed">{d.response}</p>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {d.sides.map((s, i) => {
            const letter = i === 0 ? "A" : "B";
            return (
              <button key={letter} className={button(choice === letter)} onClick={() => setChoice(letter)}>
                <div className="text-xs opacity-60">{letter} is right</div>
                <div className="font-medium">
                  {LABELS[s.evaluation]} {codeName(s.diagnosis_code)}
                </div>
                {s.note && <div className="mt-1 text-xs opacity-80">{s.note}</div>}
              </button>
            );
          })}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <button className={button(choice === "other")} onClick={() => setChoice("other")}>
            Neither: a different label
          </button>
          <button className={button(choice === "contested")} onClick={() => setChoice("contested")}>
            Contested: no rule settles it (excluded from gold)
          </button>
        </div>

        {choice === "other" && (
          <div className="mt-3 space-y-2 rounded-sm bg-slate-50 p-3 text-sm">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(LABELS) as Evaluation[]).map((e) => (
                <button key={e} className={button(otherEval === e)} onClick={() => setOtherEval(e)}>
                  {LABELS[e]}
                </button>
              ))}
            </div>
            {otherEval === "incorrect" && (
              <select
                className="w-full rounded-sm border border-slate-300 p-2"
                value={otherCode ?? ""}
                onChange={(e) => setOtherCode(e.target.value || null)}
              >
                <option value="">Diagnosis code…</option>
                {taxonomy.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {choice !== "contested" && (
          <div className="mt-5">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Which rule decides it?</div>
            <div className="mt-1 space-y-1">
              {clusterRules.map((r) => (
                <RuleOption key={r.id} r={r} selected={rule === r.id} onSelect={() => setRule(r.id)} />
              ))}
            </div>
            {!!otherRules.length && (
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-slate-600">Rules from the other cluster</summary>
                <div className="mt-1 space-y-1">
                  {otherRules.map((r) => (
                    <RuleOption key={r.id} r={r} selected={rule === r.id} onSelect={() => setRule(r.id)} />
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {!!codes.length && (
          <div className="mt-5 space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Codes in play</div>
            {codes.map((c) => (
              <div key={c.code} className="rounded-sm bg-slate-50 p-3 text-xs text-slate-700">
                <p>
                  <b>
                    {c.code} {c.name}
                  </b>{" "}
                  ({CLUSTER_NAMES[c.domain] ?? c.domain}): {c.definition}
                </p>
                {!!c.positive_examples.length && <p className="mt-1">Is this code: {c.positive_examples.join(" · ")}</p>}
                {!!c.negative_examples.length && <p className="mt-1">Not this code: {c.negative_examples.join(" · ")}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-600">Your confidence:</span>
          {([1, 2, 3] as const).map((c) => (
            <button
              key={c}
              onClick={() => setConfidence(c)}
              className={`rounded-sm border px-2 py-1 text-xs ${confidence === c ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white"}`}
            >
              {c === 1 ? "Guess" : c === 2 ? "Fairly sure" : "Certain"}
            </button>
          ))}
        </div>
        <textarea
          className="mt-3 w-full rounded-sm border border-slate-300 p-2 text-sm"
          rows={2}
          placeholder="Notes: why this rule applies here (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">Keys: A / B pick a side · Enter save · ←/→ move</span>
          <button
            disabled={!canSave || saving}
            onClick={save}
            className="rounded-sm bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            {saving ? "Saving…" : d.decision ? "Update & next" : "Save & next"}
          </button>
        </div>
      </section>
    </main>
  );
}

function RuleOption({ r, selected, onSelect }: { r: Rule; selected: boolean; onSelect: () => void }) {
  return (
    <label
      className={`block cursor-pointer rounded-sm border px-3 py-2 text-sm ${selected ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}
    >
      <input type="radio" name="rule" className="mr-2 align-middle" checked={selected} onChange={onSelect} />
      <b className="text-xs">{r.id}</b> {r.rule}
      <div className="ml-6 mt-0.5 text-xs text-slate-500">{r.examples.join(" · ")}</div>
    </label>
  );
}
