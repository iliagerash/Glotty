import { test } from "node:test";
import assert from "node:assert/strict";
import { imperfect, otherAspect, preterite } from "../../src/lib/gold/conjugate";

test("imperfect: regular and the three irregular verbs", () => {
  assert.equal(imperfect("hablar", 1, "Sing"), "hablaba");
  assert.equal(imperfect("comer", 1, "Plur"), "comíamos");
  assert.equal(imperfect("vivir", 3, "Plur"), "vivían");
  assert.equal(imperfect("ser", 3, "Sing"), "era");
  assert.equal(imperfect("ir", 1, "Plur"), "íbamos");
  assert.equal(imperfect("ver", 2, "Sing"), "veías");
});

test("preterite: regular, spelling changes, vowel stems", () => {
  assert.equal(preterite("hablar", 3, "Sing"), "habló");
  assert.equal(preterite("buscar", 1, "Sing"), "busqué");
  assert.equal(preterite("llegar", 1, "Sing"), "llegué");
  assert.equal(preterite("empezar", 1, "Sing"), "empecé");
  assert.equal(preterite("comer", 3, "Plur"), "comieron");
  assert.equal(preterite("vivir", 1, "Sing"), "viví");
  assert.equal(preterite("leer", 3, "Sing"), "leyó");
  assert.equal(preterite("leer", 2, "Sing"), "leíste");
  assert.equal(preterite("construir", 3, "Plur"), "construyeron");
});

test("preterite: irregulars and -ir stem changes", () => {
  assert.equal(preterite("tener", 1, "Sing"), "tuve");
  assert.equal(preterite("decir", 3, "Plur"), "dijeron");
  assert.equal(preterite("hacer", 3, "Sing"), "hizo");
  assert.equal(preterite("ir", 3, "Sing"), "fue");
  assert.equal(preterite("pedir", 3, "Sing"), "pidió");
  assert.equal(preterite("dormir", 3, "Plur"), "durmieron");
  assert.equal(preterite("pedir", 1, "Sing"), "pedí");
});

test("unknown -ir verbs that might stem-change are skipped in the 3rd person", () => {
  assert.equal(preterite("medir", 3, "Sing"), "midió");
  assert.equal(preterite("xenferir", 3, "Sing"), null);
  assert.equal(preterite("vivir", 3, "Sing"), "vivió");
});

test("otherAspect swaps preterite and imperfect", () => {
  assert.equal(otherAspect("caminar", "Past", 3, "Sing"), "caminaba");
  assert.equal(otherAspect("estar", "Imp", 1, "Sing"), "estuve");
});
