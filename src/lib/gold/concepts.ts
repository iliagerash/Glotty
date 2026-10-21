import type { Op } from "@/lib/gold/align";
import { fold, type Token } from "@/lib/gold/morph";
import { loadLanguage, type ConceptSpec, type FeatureSwapSpec, type WordSwapSpec } from "@/lib/language";

/**
 * A grammar concept as the data pipeline sees it (Workflow v2): which tokens
 * are its target forms, and how to read a corrector's change to them. Built
 * from a spec in the language pack (data/languages/<code>/language.json) by
 * one of two generic detectors, both reading Universal Dependencies features
 * from spaCy (morph.ts), not spelling. The correction decides the label;
 * anything a concept cannot read cleanly is "unreadable" and the sentence is
 * not used for it.
 */
export interface Concept {
  /** Short key, e.g. "pret_imp"; unique within a language. */
  key: string;
  /** The taxonomy cluster the evaluator reports (concept_ids), e.g. "es.gram.aspect.pret_imp". */
  cluster: string;
  isTarget(t: Token): boolean;
  /** A corrector's change, read for this concept. */
  read(op: Op): Reading;
}

/**
 * What one change means for a concept: errors found, target forms the change
 * confirmed (kept: e.g. habló -> hablé fixes the person but keeps the
 * preterite), or unreadable (the change can't be read as right or wrong for
 * this concept, so the sentence is not used).
 */
export type Reading = { findings: Finding[]; kept: string[]; unreadable: boolean };

export type Finding = { concept: string; from: string; to: string };

const NOTHING: Reading = { findings: [], kept: [], unreadable: false };

/**
 * feature-swap, read on the target forms inside each change. Forms outside
 * the spec (conditional Mood=Cnd, future Tense=Fut) are not targets, so they
 * can't be mistaken for it. With exactly one target on each side:
 *   - same lemma, values swapped (e.g. preterite Tense=Past <-> imperfect
 *     Tense=Imp): an error, also inside a wider rewrite (necesité a ser
 *     enfocado -> necesitaba estar concentrado);
 *   - value kept (habló -> hablé fixes the person; era -> estaba fixes
 *     ser/estar): the learner's choice is confirmed;
 *   - another lemma and the value changed (fue -> estaba): two errors mixed,
 *     unreadable.
 * A target the corrector inserted where the learner wrote no word of that
 * kind is ignored (the learner made no choice); one replacing a non-target
 * word of that kind (hay -> había: a tense error) is unreadable, and so is a
 * deleted target or several targets in one change.
 */
function featureSwap(spec: FeatureSwapSpec): Concept {
  const value = (t: Token) => {
    if (!spec.pos.includes(t.pos)) return null;
    if (Object.entries(spec.require ?? {}).some(([k, v]) => t.feats[k] !== v)) return null;
    const v = t.feats[spec.feature];
    return spec.values.includes(v) ? v : null;
  };
  return {
    key: spec.key,
    cluster: spec.cluster,
    isTarget: (t) => value(t) !== null,
    read(op) {
      if (op.kind !== "change") return NOTHING;
      const lt = op.learner.filter((t) => value(t));
      const ct = op.corrected.filter((t) => value(t));
      if (lt.length === 1 && ct.length === 1) {
        const [l, c] = [lt[0], ct[0]];
        const [from, to] = [value(l), value(c)];
        if (from === to) return { findings: [], kept: [l.text], unreadable: false };
        if (fold(l.lemma) === fold(c.lemma)) return { findings: [{ concept: spec.key, from: l.text, to: c.text }], kept: [], unreadable: false };
        return { findings: [], kept: [], unreadable: true };
      }
      if (!lt.length && !ct.length) return NOTHING;
      // Corrector inserted a target: ignored unless it replaced a learner word of that kind.
      if (!lt.length) return { findings: [], kept: [], unreadable: op.learner.some((t) => spec.pos.includes(t.pos)) };
      return { findings: [], kept: [], unreadable: true };
    },
  };
}

/**
 * word-swap: a finding is a one-word swap between two words of the set
 * (e.g. por <-> para). A target the corrector dropped, or replaced with a
 * word outside the set, is often a matter of style, so the sentence is not
 * used either way. A target the corrector only inserted (the learner wrote
 * nothing there) is ignored: the learner made no choice.
 */
function wordSwap(spec: WordSwapSpec): Concept {
  const words = new Set(spec.words.map(fold));
  const isTarget = (t: Token) => words.has(fold(t.text)) && !(spec.exclude_pos ?? []).includes(t.pos);
  return {
    key: spec.key,
    cluster: spec.cluster,
    isTarget,
    read(op) {
      if (op.kind !== "change") return NOTHING;
      const touches = op.learner.some(isTarget) || (op.corrected.some(isTarget) && op.learner.length > 0);
      if (!touches) return NOTHING;
      const [l] = op.learner;
      const [c] = op.corrected;
      if (op.learner.length === 1 && op.corrected.length === 1 && isTarget(l) && isTarget(c) && fold(l.text) !== fold(c.text)) {
        return { findings: [{ concept: spec.key, from: l.text, to: c.text }], kept: [], unreadable: false };
      }
      return { findings: [], kept: [], unreadable: true };
    },
  };
}

export function buildConcept(spec: ConceptSpec): Concept {
  switch (spec.detector) {
    case "feature-swap":
      return featureSwap(spec);
    case "word-swap":
      return wordSwap(spec);
  }
}

/** A language's concepts by key. */
export function conceptsFor(language: string): Record<string, Concept> {
  return Object.fromEntries(loadLanguage(language).concepts.map((s) => [s.key, buildConcept(s)]));
}

/** What a corrector did to one sentence, for one concept. */
export function readSentence(concept: Concept, ops: Op[]) {
  const read = ops.map((op) => concept.read(op));
  return {
    findings: read.flatMap((r) => r.findings),
    unreadable: read.some((r) => r.unreadable),
    untouched: [
      ...ops.filter((op) => op.kind === "equal").flatMap((op) => op.learner).filter(concept.isTarget).map((t) => t.text),
      ...read.flatMap((r) => r.kept),
    ],
  };
}

export type WindowLabel = { kind: "error" | "correct"; findings: Finding[]; untouched: string[] } | null;

/**
 * Labels a two-sentence item (context + current) for one concept, as the
 * evaluator sees it: the whole response. An error in either sentence makes
 * it an error; no error and at least one confirmed target form makes it
 * correct. Null when the concept can't read either sentence or the item has
 * no target form.
 */
export function labelWindow(concept: Concept, context: Op[], current: Op[]): WindowLabel {
  const a = readSentence(concept, context);
  const b = readSentence(concept, current);
  if (a.unreadable || b.unreadable) return null;
  const findings = [...a.findings, ...b.findings];
  const untouched = [...a.untouched, ...b.untouched];
  if (findings.length) return { kind: "error", findings, untouched };
  return untouched.length ? { kind: "correct", findings: [], untouched } : null;
}
