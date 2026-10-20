import { test } from "node:test";
import assert from "node:assert/strict";
import { alignBySentence, aspectSwap, isImperfect, isPreterite, sentences, targetChanges, untouchedTargets, words } from "../../src/lib/gold/anchor";

const ops = (learner: string, corrected: string) => alignBySentence([learner], corrected)[0];

test("aspectSwap pairs a preterite and an imperfect of one verb", () => {
  assert.ok(aspectSwap("fueron", "eran"));
  assert.ok(aspectSwap("llevó", "llevaba"));
  assert.ok(aspectSwap("tuve", "tenía"));
  assert.ok(aspectSwap("brillaba", "brilló"));
  assert.ok(!aspectSwap("hablo", "hablaba"), "unaccented -o is present, not preterite");
  assert.ok(!aspectSwap("fue", "fue"));
  assert.ok(!aspectSwap("comió", "bebía"), "different verbs");
});

test("verb-form tests do not take common nouns and adjectives for verbs", () => {
  for (const w of ["familia", "historia", "triste", "hablo"]) assert.ok(!isPreterite(w) && !isImperfect(w), w);
});

test("targetChanges reads a por/para swap and an aspect swap, nothing else", () => {
  assert.deepEqual(targetChanges(ops("Hablaron para horas.", "Hablaron por horas.")).findings, [{ kind: "por_para", from: "para", to: "por" }]);
  assert.deepEqual(targetChanges(ops("Los estudiantes fueron malos.", "Los estudiantes eran malos.")).findings, [
    { kind: "aspect", from: "fueron", to: "eran" },
  ]);
  // Gender and spelling corrections are not target changes.
  assert.deepEqual(targetChanges(ops("Fui a la cine para ver una pelicula.", "Fui al cine para ver una película.")), {
    findings: [],
    unreadable: false,
  });
  // A por/para dropped or replaced by another preposition is not used either way.
  assert.equal(targetChanges(ops("Busco para mis llaves.", "Busco mis llaves.")).unreadable, true);
  assert.equal(targetChanges(ops("Soy de un equipo para mi cultura.", "Soy de un equipo de mi cultura.")).unreadable, true);
  // Words run together in a correction can't be read.
  assert.equal(targetChanges(ops("Ella tuvo los ojos azules.", "Ella tuvoTenía los ojos azules.")).unreadable, true);
});

test("untouchedTargets keeps sure target forms only", () => {
  assert.deepEqual(untouchedTargets(ops("Todavía había pan para comer y todo estaba bien.", "Todavía había pan para comer y todo estaba bien.")), [
    "para",
    "estaba",
  ]);
  assert.deepEqual(untouchedTargets(ops("Es un cliché, pero la mayoría está aquí.", "Es un cliché, pero la mayoría está aquí.")), []);
});

test("alignBySentence keeps each correction on its learner sentence", () => {
  const [first, second] = alignBySentence(["Fui al parque.", "Hablaron para horas."], "Fui al parque. Hablaron por horas.");
  assert.deepEqual(targetChanges(first).findings, []);
  assert.equal(targetChanges(second).findings[0]?.kind, "por_para");
});

test("sentences and words", () => {
  assert.deepEqual(sentences("Fui al parque.  ¡Qué bonito!   Luego volví"), ["Fui al parque.", "¡Qué bonito!", "Luego volví"]);
  assert.deepEqual(words("¿Por qué, María?"), ["Por", "qué", "María"]);
});
