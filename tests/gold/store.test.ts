import { test } from "node:test";
import assert from "node:assert/strict";
import { HELDOUT_SHARE, itemIdFor, splitOf } from "../../src/lib/gold/store";

test("splitOf is deterministic and close to the held-out share", () => {
  const ids = Array.from({ length: 4000 }, (_, i) => `item-${i}`);
  assert.equal(splitOf("x"), splitOf("x"));
  const share = ids.filter((id) => splitOf(id) === "heldout").length / ids.length;
  assert.ok(Math.abs(share - HELDOUT_SHARE) < 0.03, `held-out share ${share}`);
});

test("itemIdFor ignores case and whitespace differences", () => {
  assert.equal(itemIdFor("syn", "Fui  a la playa."), itemIdFor("syn", "fui a la playa."));
  assert.notEqual(itemIdFor("syn", "Fui a la playa."), itemIdFor("syn", "Iba a la playa."));
});
