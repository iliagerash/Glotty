import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { modelForTier, parseModelRef } from "../../src/lib/ai/config";

afterEach(() => {
  delete process.env.GLOTTY_MODEL_FAST;
  delete process.env.GLOTTY_MODEL_STRONG;
  delete process.env.GLOTTY_EFFORT_FAST;
  delete process.env.GLOTTY_EFFORT_STRONG;
});

test("tier effort comes from its own variable and is recorded in the ref", () => {
  process.env.GLOTTY_MODEL_FAST = "cloudflare:@cf/openai/gpt-oss-20b";
  process.env.GLOTTY_EFFORT_FAST = "low";
  const fast = modelForTier("fast");
  assert.equal(fast.model, "@cf/openai/gpt-oss-20b");
  assert.equal(fast.reasoningEffort, "low");
  assert.equal(fast.ref, "cloudflare:@cf/openai/gpt-oss-20b#low");
});

test("rejects a tier with both an effort suffix and an effort variable", () => {
  process.env.GLOTTY_MODEL_STRONG = "cloudflare:@cf/moonshotai/kimi-k2.6#none";
  process.env.GLOTTY_EFFORT_STRONG = "low";
  assert.throws(() => modelForTier("strong"), /use one or the other/);
});

test("rejects an unknown effort variable", () => {
  process.env.GLOTTY_MODEL_FAST = "cloudflare:@cf/openai/gpt-oss-20b";
  process.env.GLOTTY_EFFORT_FAST = "turbo";
  assert.throws(() => modelForTier("fast"), /Invalid GLOTTY_EFFORT_FAST/);
});

test("tiers come only from the environment", () => {
  process.env.GLOTTY_MODEL_FAST = "cloudflare:@cf/openai/gpt-oss-20b#low";
  process.env.GLOTTY_MODEL_STRONG = "cloudflare:@cf/moonshotai/kimi-k2.6#none";
  const fast = modelForTier("fast");
  assert.equal(fast.model, "@cf/openai/gpt-oss-20b");
  assert.equal(fast.reasoningEffort, "low");
  assert.equal(modelForTier("strong").reasoningEffort, "none");
});

test("an unset tier fails loudly instead of falling back", () => {
  assert.throws(() => modelForTier("strong"), /GLOTTY_MODEL_STRONG is not set/);
});

test("a tier ref without a suffix leaves the provider default effort", () => {
  process.env.GLOTTY_MODEL_STRONG = "cloudflare:@cf/zai-org/glm-5.3";
  const strong = modelForTier("strong");
  assert.equal(strong.model, "@cf/zai-org/glm-5.3");
  assert.equal(strong.reasoningEffort, undefined);
});

test("rejects more than one effort suffix", () => {
  assert.throws(() => parseModelRef("cloudflare:@cf/x#low#high"), /reasoning effort/);
});
