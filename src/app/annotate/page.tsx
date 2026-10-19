"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Evaluation = "correct" | "incorrect" | "uncertain" | "not_applicable";

interface Item {
  id: string;
  prompt: string;
  response: string;
}

interface Annotation {
  item_id: string;
  evaluation: Evaluation;
  diagnosis_code: string | null;
  confidence: 1 | 2 | 3;
  notes?: string;
}

interface Code {
  code: string;
  name: string;
  domain: string;
  definition: string;
  negative_examples: string[];
}

const EVALUATIONS: Array<{ value: Evaluation; label: string; key: string; hint: string }> = [
  { value: "correct", label: "Correct", key: "1", hint: "The tense / por-para choices fit the most plausible intent" },
  { value: "incorrect", label: "Incorrect", key: "2", hint: "A target choice is wrong under every plausible intent" },
  { value: "uncertain", label: "Ambiguous", key: "3", hint: "Right under one plausible intent, wrong under another" },
  { value: "not_applicable", label: "N/A", key: "4", hint: "No preterite/imperfect or por/para choice in it" },
];

const CONFIDENCE: Array<{ value: 1 | 2 | 3; label: string }> = [
  { value: 1, label: "Guess" },
  { value: 2, label: "Fairly sure" },
  { value: 3, label: "Certain" },
];

const CLUSTER_NAMES: Record<string, string> = {
  "es.gram.aspect.pret_imp": "Preterite / imperfect",
  "es.sem.por_para": "Por / para",
};

export default function AnnotatePage() {
  const [annotator, setAnnotator] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [done, setDone] = useState<Record<string, Annotation>>({});
  const [taxonomy, setTaxonomy] = useState<Code[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<1 | 2 | 3>(2);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("glotty.annotator");
      if (saved) {
        setAnnotator(saved);
        setNameInput(saved);
      }
    } catch {}
  }, []);

  const load = useCallback(async (name: string) => {
    setError(null);
    const res = await fetch(`/api/gold?annotator=${encodeURIComponent(name)}`);
    const body = await res.json();
    if (!res.ok) {
      setError(body.error);
      return;
    }
    setItems(body.items);
    setDone(body.annotations);
    setTaxonomy(body.taxonomy);
    const firstOpen = body.items.findIndex((i: Item) => !body.annotations[i.id]);
    setIndex(firstOpen === -1 ? 0 : firstOpen);
  }, []);

  useEffect(() => {
    if (annotator) load(annotator);
  }, [annotator, load]);

  const item = items[index];

  // Load any existing annotation into the form when moving between items.
  useEffect(() => {
    if (!item) return;
    const a = done[item.id];
    setEvaluation(a?.evaluation ?? null);
    setCode(a?.diagnosis_code ?? null);
    setConfidence(a?.confidence ?? 2);
    setNotes(a?.notes ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const clusters = useMemo(() => {
    const groups = new Map<string, Code[]>();
    for (const c of taxonomy) {
      const key = CLUSTER_NAMES[c.domain] ? c.domain : "other";
      groups.set(key, [...(groups.get(key) ?? []), c]);
    }
    return groups;
  }, [taxonomy]);

  const doneCount = items.filter((i) => done[i.id]).length;
  const canSave = evaluation !== null && (evaluation !== "incorrect" || code !== null);

  const goToNextOpen = useCallback(
    (from: number, annotations: Record<string, Annotation>) => {
      for (let k = 1; k <= items.length; k++) {
        const j = (from + k) % items.length;
        if (!annotations[items[j].id]) return setIndex(j);
      }
      setIndex(Math.min(from + 1, items.length - 1));
    },
    [items],
  );

  const save = useCallback(async () => {
    if (!item || !canSave || saving) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/gold/annotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        annotator,
        item_id: item.id,
        evaluation,
        diagnosis_code: evaluation === "incorrect" ? code : null,
        confidence,
        notes,
      }),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(body.error);
      return;
    }
    const next = { ...done, [item.id]: body.annotation };
    setDone(next);
    goToNextOpen(index, next);
  }, [item, canSave, saving, annotator, evaluation, code, confidence, notes, done, index, goToNextOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
        return;
      }
      const ev = EVALUATIONS.find((x) => x.key === e.key);
      if (ev) setEvaluation(ev.value);
      else if (e.key === "Enter") save();
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, items.length - 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, items.length]);

  if (!annotator) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-semibold">Gold set annotation</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your labels are saved under this name in <code>data/gold/annotations/</code>. Use the same name every time.
        </p>
        <form
          className="mt-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const name = nameInput.trim().toLowerCase();
            if (!/^[a-z0-9_-]{1,40}$/.test(name)) return setError("Use a-z, 0-9, _ or -");
            try {
              localStorage.setItem("glotty.annotator", name);
            } catch {}
            setAnnotator(name);
          }}
        >
          <input
            className="flex-1 rounded border border-slate-300 bg-white px-3 py-2"
            placeholder="e.g. ilia"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
          />
          <button className="rounded bg-slate-900 px-4 py-2 text-white">Start</button>
        </form>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">Gold set annotation</h1>
        <div className="text-sm text-slate-600">
          {annotator} · {doneCount} / {items.length} labelled ·{" "}
          <button
            className="underline"
            onClick={() => {
              setAnnotator("");
              setItems([]);
            }}
          >
            switch
          </button>
        </div>
      </header>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-slate-200">
        <div className="h-full bg-slate-700" style={{ width: `${items.length ? (100 * doneCount) / items.length : 0}%` }} />
      </div>

      {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      {item && (
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              #{index + 1} · {item.id} {done[item.id] && <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5">labelled</span>}
            </span>
            <span>
              <button className="px-2 hover:underline" onClick={() => setIndex(Math.max(index - 1, 0))}>
                ← prev
              </button>
              <button className="px-2 hover:underline" onClick={() => setIndex(Math.min(index + 1, items.length - 1))}>
                next →
              </button>
            </span>
          </div>
          {item.prompt && <p className="mt-3 text-sm italic text-slate-600">Tutor: {item.prompt}</p>}
          <p className="mt-2 text-lg leading-relaxed">{item.response}</p>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {EVALUATIONS.map((ev) => (
              <button
                key={ev.value}
                title={ev.hint}
                onClick={() => setEvaluation(ev.value)}
                className={`rounded border px-3 py-2 text-sm ${
                  evaluation === ev.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white hover:bg-slate-50"
                }`}
              >
                <span className="mr-1 text-xs opacity-60">{ev.key}</span>
                {ev.label}
              </button>
            ))}
          </div>
          {evaluation && <p className="mt-1 text-xs text-slate-500">{EVALUATIONS.find((e) => e.value === evaluation)?.hint}</p>}

          {evaluation === "incorrect" && (
            <div className="mt-4 space-y-3">
              {[...clusters.entries()].map(([cluster, codes]) => (
                <div key={cluster}>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{CLUSTER_NAMES[cluster] ?? "Other"}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {codes.map((c) => (
                      <button
                        key={c.code}
                        title={c.definition}
                        onClick={() => setCode(c.code)}
                        className={`rounded border px-2 py-1 text-xs ${
                          code === c.code ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <b>{c.code}</b> {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {code && (
                <div className="rounded bg-slate-50 p-3 text-xs text-slate-700">
                  <p>{taxonomy.find((c) => c.code === code)?.definition}</p>
                  {!!taxonomy.find((c) => c.code === code)?.negative_examples.length && (
                    <p className="mt-2">
                      <b>Not this code:</b> {taxonomy.find((c) => c.code === code)!.negative_examples.join(" · ")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-600">Your confidence:</span>
            {CONFIDENCE.map((c) => (
              <button
                key={c.value}
                onClick={() => setConfidence(c.value)}
                className={`rounded border px-2 py-1 text-xs ${
                  confidence === c.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <textarea
            className="mt-3 w-full rounded border border-slate-300 p-2 text-sm"
            rows={2}
            placeholder="Notes: the intended reading, regional usage, why a code fits or not (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-500">Keys: 1–4 label · Enter save · ←/→ move</span>
            <button
              disabled={!canSave || saving}
              onClick={save}
              className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save & next"}
            </button>
          </div>
        </section>
      )}

      <AddItem onAdded={() => load(annotator)} />
    </main>
  );
}

function AddItem({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [source, setSource] = useState<"learner" | "hand_written">("learner");
  const [origin, setOrigin] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/gold/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, response, source, origin: origin || undefined }),
    });
    const body = await res.json();
    if (!res.ok) return setMessage(body.error);
    setMessage(`Added ${body.item.id}`);
    setResponse("");
    onAdded();
  }

  return (
    <section className="mt-8 border-t border-slate-200 pt-4">
      <button className="text-sm underline" onClick={() => setOpen(!open)}>
        {open ? "Hide" : "Add a real learner response"}
      </button>
      {open && (
        <form onSubmit={submit} className="mt-3 space-y-2 text-sm">
          <p className="text-xs text-slate-600">
            Real learner writing is what §24 asks for. Remove names and anything identifying before adding it.
          </p>
          <input className="w-full rounded border border-slate-300 p-2" placeholder="Prompt or question it answered (optional)" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <textarea className="w-full rounded border border-slate-300 p-2" rows={2} placeholder="Learner response" value={response} onChange={(e) => setResponse(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <select className="rounded border border-slate-300 p-2" value={source} onChange={(e) => setSource(e.target.value as "learner" | "hand_written")}>
              <option value="learner">Real learner writing</option>
              <option value="hand_written">Written by me</option>
            </select>
            <input className="flex-1 rounded border border-slate-300 p-2" placeholder="Origin note (optional)" value={origin} onChange={(e) => setOrigin(e.target.value)} />
            <button className="rounded bg-slate-900 px-4 py-2 text-white">Add</button>
          </div>
          {message && <p className="text-xs text-slate-600">{message}</p>}
        </form>
      )}
    </section>
  );
}
