import { test } from "node:test";
import assert from "node:assert/strict";
import { extractJson } from "../../src/lib/ai/json";

test("parses plain JSON", () => {
  assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
});

test("parses fenced JSON after prose", () => {
  assert.deepEqual(extractJson('Here you go:\n```json\n{"a": [1, 2]}\n```'), { a: [1, 2] });
});

test("strips <think> blocks", () => {
  assert.deepEqual(extractJson('<think>maybe {"a":0}</think>\n{"a":2}'), { a: 2 });
});

test("finds a balanced object with braces inside strings", () => {
  assert.deepEqual(extractJson('Answer: {"s": "a } b", "n": {"x": 1}} trailing'), { s: "a } b", n: { x: 1 } });
});

test("returns undefined when there is no JSON", () => {
  assert.equal(extractJson("no json here"), undefined);
});
