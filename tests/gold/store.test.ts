import { test } from "node:test";
import assert from "node:assert/strict";
import { itemIdFor, splitOf } from "../../src/lib/gold/store";

test("splitOf puts judge b's items and learner text in held-out, the rest in dev", () => {
  assert.equal(splitOf({ source: "llm_synthetic", origin: "google:gemini-3.8-flash#medium for PI.01" }), "heldout");
  assert.equal(splitOf({ source: "learner" }), "heldout");
  assert.equal(splitOf({ source: "llm_synthetic", origin: "openai:gpt-6-luna#medium for PI.01" }), "dev");
  assert.equal(splitOf({ source: "legacy_synthetic", origin: "legacy gold_set" }), "dev");
  assert.equal(splitOf({ source: "hand_written" }), "dev");
});

test("itemIdFor ignores case and whitespace differences", () => {
  assert.equal(itemIdFor("syn", "Fui  a la playa."), itemIdFor("syn", "fui a la playa."));
  assert.notEqual(itemIdFor("syn", "Fui a la playa."), itemIdFor("syn", "Iba a la playa."));
});
