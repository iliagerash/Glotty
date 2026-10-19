/**
 * Model registry for the gateway (§36, §45).
 *
 * A model reference is "<provider>:<model id>", e.g.
 *   cloudflare:@cf/meta/llama-3.3-70b-instruct-fp8-fast
 *   openai-compat:some-model          (any OpenAI-compatible endpoint)
 *
 * Product code never names a model directly. It asks for a tier, and the
 * tier is mapped to a model reference through the environment, so routing
 * can change without touching product logic.
 */

export type Tier = "fast" | "strong";

export type ProviderName = "cloudflare" | "openai-compat";

export interface ModelRef {
  provider: ProviderName;
  model: string;
  /** The full "<provider>:<model>" string, used in version tags and logs. */
  ref: string;
}

/**
 * Cloudflare Workers AI text-generation models worth benchmarking as the
 * evaluator. Verify availability with `npm run ai:models` before relying on
 * this list; Cloudflare adds and retires models regularly.
 */
export const CLOUDFLARE_CANDIDATES = [
  "cloudflare:@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "cloudflare:@cf/meta/llama-4-scout-17b-16e-instruct",
  "cloudflare:@cf/mistralai/mistral-small-3.1-24b-instruct",
  "cloudflare:@cf/qwen/qwen3-30b-a3b-fp8",
  "cloudflare:@cf/google/gemma-3-12b-it",
  "cloudflare:@cf/openai/gpt-oss-120b",
  "cloudflare:@cf/openai/gpt-oss-20b",
];

const DEFAULT_TIERS: Record<Tier, string> = {
  fast: "cloudflare:@cf/meta/llama-4-scout-17b-16e-instruct",
  strong: "cloudflare:@cf/meta/llama-3.3-70b-instruct-fp8-fast",
};

export function parseModelRef(ref: string): ModelRef {
  const i = ref.indexOf(":");
  if (i <= 0) {
    throw new Error(`Invalid model reference "${ref}": expected "<provider>:<model>"`);
  }
  const provider = ref.slice(0, i);
  const model = ref.slice(i + 1);
  if (provider !== "cloudflare" && provider !== "openai-compat") {
    throw new Error(`Unknown provider "${provider}" in model reference "${ref}"`);
  }
  return { provider, model, ref };
}

export function modelForTier(tier: Tier): ModelRef {
  const envKey = tier === "fast" ? "GLOTTY_MODEL_FAST" : "GLOTTY_MODEL_STRONG";
  return parseModelRef(process.env[envKey] || DEFAULT_TIERS[tier]);
}

/** Accepts a tier name or an explicit model reference. */
export function resolveModel(tierOrRef: Tier | string): ModelRef {
  if (tierOrRef === "fast" || tierOrRef === "strong") return modelForTier(tierOrRef);
  return parseModelRef(tierOrRef);
}
