import { test } from "node:test";
import assert from "node:assert/strict";
import { alignBySentence } from "../../src/lib/gold/align";
import { buildConcept, conceptsFor, labelWindow, readSentence } from "../../src/lib/gold/concepts";
import { textOf, toToken, type Token } from "../../src/lib/gold/morph";

// Tokens shaped like tools/morph/annotate.py output: [text, lemma, pos, feats, sent, space].
const PAST = "Mood=Ind|Number=Plur|Person=3|Tense=Past|VerbForm=Fin";
const IMP = "Mood=Ind|Number=Plur|Person=3|Tense=Imp|VerbForm=Fin";
const t = (text: string, lemma = text.toLowerCase(), pos = "NOUN", feats = "", sent = 0, space = 1): Token =>
  toToken([text, lemma, pos, feats, sent, space]);
const verb = (text: string, lemma: string, feats: string, sent = 0) => t(text, lemma, "VERB", feats, sent);
const op = (learner: Token[], corrected: Token[]) => ({ kind: "change" as const, learner, corrected });
// Built from the Spanish language pack (data/languages/es/language.json), as the importers do.
const { pret_imp: PRET_IMP, por_para: POR_PARA } = conceptsFor("es");

test("pret_imp: a preterite/imperfect swap of one verb is an error", () => {
  const r = PRET_IMP.read(op([verb("fueron", "ser", PAST)], [verb("eran", "ser", IMP)]));
  assert.deepEqual(r, { findings: [{ concept: "pret_imp", from: "fueron", to: "eran" }], kept: [], unreadable: false });
});

test("pret_imp: conditional, future and other changes are never aspect errors", () => {
  const cnd = "Mood=Cnd|Number=Sing|Person=3|VerbForm=Fin";
  const fut = "Mood=Ind|Number=Sing|Person=1|Tense=Fut|VerbForm=Fin";
  // Conditional -> preterite touches a target form: not used either way.
  assert.deepEqual(PRET_IMP.read(op([verb("imaginaría", "imaginar", cnd)], [verb("imaginó", "imaginar", PAST)])), { findings: [], kept: [], unreadable: true });
  // Conditional -> future: no target form at all.
  assert.deepEqual(PRET_IMP.read(op([verb("olvidaría", "olvidar", cnd)], [verb("olvidaré", "olvidar", fut)])), { findings: [], kept: [], unreadable: false });
  // Same tense, another person (fue -> fui): the preterite is confirmed, not an aspect error.
  assert.deepEqual(PRET_IMP.read(op([verb("fue", "ser", PAST)], [verb("fui", "ser", PAST)])), { findings: [], kept: ["fue"], unreadable: false });
  // Present -> imperfect (hay -> había): a tense error, not a pret/imp choice; not used either way.
  const pres = "Mood=Ind|Number=Sing|Person=3|Tense=Pres|VerbForm=Fin";
  assert.equal(PRET_IMP.read(op([verb("hay", "haber", pres)], [verb("había", "haber", IMP)])).unreadable, true);
  // Verb changed, aspect kept (era -> estaba): confirmed. Verb and aspect changed (fue -> estaba): mixed, not used.
  assert.deepEqual(PRET_IMP.read(op([verb("era", "ser", IMP)], [verb("estaba", "estar", IMP)])).kept, ["era"]);
  assert.equal(PRET_IMP.read(op([verb("fue", "ser", PAST)], [verb("estaba", "estar", IMP)])).unreadable, true);
  // An aspect swap inside a wider rewrite is still an error.
  const inf = "VerbForm=Inf";
  assert.deepEqual(
    PRET_IMP.read(op([verb("necesité", "necesitar", PAST), t("a", "a", "ADP"), verb("ser", "ser", inf)], [verb("necesitaba", "necesitar", IMP), verb("estar", "estar", inf)])).findings,
    [{ concept: "pret_imp", from: "necesité", to: "necesitaba" }],
  );
  // A verb the corrector only inserted: the learner made no choice.
  assert.deepEqual(PRET_IMP.read(op([], [verb("tomó", "tomar", PAST)])), { findings: [], kept: [], unreadable: false });
  // Different verbs.
  assert.equal(PRET_IMP.read(op([verb("comió", "comer", PAST)], [verb("bebía", "beber", IMP)])).findings.length, 0);
});

test("por_para: only a one-word por <-> para swap is an error", () => {
  assert.deepEqual(POR_PARA.read(op([t("para", "para", "ADP")], [t("por", "por", "ADP")])), {
    findings: [{ concept: "por_para", from: "para", to: "por" }],
    kept: [],
    unreadable: false,
  });
  assert.deepEqual(POR_PARA.read(op([t("para", "para", "ADP")], [])), { findings: [], kept: [], unreadable: true });
  assert.deepEqual(POR_PARA.read(op([t("para", "para", "ADP")], [t("de", "de", "ADP")])), { findings: [], kept: [], unreadable: true });
  // A por/para the corrector only inserted is ignored.
  assert.deepEqual(POR_PARA.read(op([], [t("para", "para", "ADP")])), { findings: [], kept: [], unreadable: false });
  // The verb parar ("el autobús para aquí") is not a target form.
  assert.equal(POR_PARA.isTarget(t("para", "parar", "VERB", "Mood=Ind|Tense=Pres|VerbForm=Fin")), false);
});

test("alignBySentence keeps each change on its learner sentence, and labelWindow reads it", () => {
  const learner = [
    t("Fui", "ir", "VERB", PAST, 0), t("al", "al", "ADP", "", 0), t("parque", "parque", "NOUN", "", 0), t("ayer", "ayer", "ADV", "", 0, 0), t(".", ".", "PUNCT", "", 0),
    t("Hablamos", "hablar", "VERB", PAST, 1), t("para", "para", "ADP", "", 1), t("dos", "dos", "NUM", "", 1), t("horas", "hora", "NOUN", "", 1, 0), t(".", ".", "PUNCT", "", 1, 0),
  ];
  const corrected = learner.map((x) => (x.text === "para" ? t("por", "por", "ADP", "", 1) : x));
  const [first, second] = alignBySentence(learner, corrected);
  assert.equal(readSentence(POR_PARA, first).findings.length, 0);
  assert.deepEqual(readSentence(POR_PARA, second).findings, [{ concept: "por_para", from: "para", to: "por" }]);
  // The whole response is labelled: an error in either sentence makes it an error.
  assert.equal(labelWindow(POR_PARA, first, second)?.kind, "error");
  assert.equal(labelWindow(POR_PARA, second, first)?.kind, "error");
  // pret_imp: the preterites were left as written -> correct.
  assert.deepEqual(labelWindow(PRET_IMP, first, second), { kind: "correct", findings: [], untouched: ["Fui", "Hablamos"] });
  assert.equal(textOf(learner), "Fui al parque ayer. Hablamos para dos horas.");
});

test("a new concept is a spec, not code: indicative vs subjunctive as a feature swap", () => {
  const mood = buildConcept({
    key: "ind_sub",
    cluster: "es.gram.mood.ind_sub",
    name: "Indicative vs subjunctive",
    code_prefix: "MOD",
    detector: "feature-swap",
    pos: ["VERB", "AUX"],
    require: { VerbForm: "Fin" },
    feature: "Mood",
    values: ["Ind", "Sub"],
  });
  const ind = "Mood=Ind|Number=Sing|Person=3|Tense=Pres|VerbForm=Fin";
  const sub = "Mood=Sub|Number=Sing|Person=3|Tense=Pres|VerbForm=Fin";
  assert.deepEqual(mood.read(op([verb("viene", "venir", ind)], [verb("venga", "venir", sub)])).findings, [{ concept: "ind_sub", from: "viene", to: "venga" }]);
  assert.equal(mood.isTarget(verb("venía", "venir", IMP)), true, "imperfect indicative is a mood target too");
});
