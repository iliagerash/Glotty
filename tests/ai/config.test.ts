import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { modelForTier, parseModelRef } from "../../src/lib/ai/config";

afterEach(() => {
  delete process.env.GLOTTY_MODEL_FAST;
  delete process.env.GLOTTY_MODEL_STRONG;
});

test("default tiers resolve to Workers AI models with their reasoning effort", () => {
  const fast = modelForTier("fast");
  const strong = modelForTier("strong");
  assert.equal(fast.provider, "cloudflare");
  assert.equal(fast.model, "@cf/openai/gpt-oss-20b");
  assert.equal(fast.reasoningEffort, "low");
  assert.equal(strong.model, "@cf/moonshotai/kimi-k2.6");
  assert.equal(strong.reasoningEffort, "none");
});

test("environment overrides a tier, suffix optional", () => {
  process.env.GLOTTY_MODEL_STRONG = "cloudflare:@cf/zai-org/glm-5.3";
  const strong = modelForTier("strong");
  assert.equal(strong.model, "@cf/zai-org/glm-5.3");
  assert.equal(strong.reasoningEffort, undefined);
});

test("rejects more than one effort suffix", () => {
  assert.throws(() => parseModelRef("cloudflare:@cf/x#low#high"), /reasoning effort/);
});
