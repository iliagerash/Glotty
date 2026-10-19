/**
 * Model registry for the gateway (§36, §45).
 *
 * A model reference is "<provider>:<model id>", e.g.
 *   cloudflare:@cf/meta/llama-3.3-70b-instruct-fp8-fast
 *   openai-compat:some-model          (any OpenAI-compatible endpoint)
 *
 * A reasoning model's effort can be pinned with a "#<effort>" suffix, e.g.
 *   cloudflare:@cf/openai/gpt-oss-120b#low
 * The suffix is part of the ref, so it is recorded in evaluator versions.
 *
 * Product code never names a model directly. It asks for a tier, and the
 * tier is mapped to a model reference through the environment, so routing
 * can change without touching product logic.
 */

export type Tier = "fast" | "strong";

export type ProviderName = "cloudflare" | "openai-compat";

export const REASONING_EFFORTS = ["none", "low", "medium", "high"] as const;
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

export interface ModelRef {
  provider: ProviderName;
  model: string;
  /** Sent as `reasoning_effort` when set. Unset means the provider default. */
  reasoningEffort?: ReasoningEffort;
  /** The full "<provider>:<model>" string, used in version tags and logs. */
  ref: string;
}

/**
 * Cloudflare Workers AI text-generation models worth benchmarking as the
 * evaluator. Verify availability with `npm run ai:models` before relying on
 * this list; Cloudflare adds and retires models regularly.
 *
 * Checked 2026-10-19 with `ai:models` and `ai:ping`. Left out on purpose:
 * gemma-3-12b-it (no longer served to this account, HTTP 403),
 * eurollm-9b-it (listed, but every call fails "AI model does not have config"),
 * nemotron-3-120b-a12b (HTTP 408 timeouts; 84s for a 400-token reply),
 * glm-4.7-flash (reasoning consumes the budget; rejects reasoning_effort=none).
 *
 * Effort suffixes keep reasoning models inside the evaluator's latency and
 * token budget. Do not use "#none" on qwen3-30b-a3b: Workers AI then returns
 * the answer in `reasoning` and leaves `content` empty.
 */
export const CLOUDFLARE_CANDIDATES = [
  "cloudflare:@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "cloudflare:@cf/meta/llama-4-scout-17b-16e-instruct",
  "cloudflare:@cf/mistralai/mistral-small-3.1-24b-instruct",
  "cloudflare:@cf/qwen/qwen3-30b-a3b-fp8",
  "cloudflare:@cf/qwen/qwen3.8-27b#low",
  "cloudflare:@cf/google/gemma-4-26b-a4b-it",
  "cloudflare:@cf/openai/gpt-oss-120b#low",
  "cloudflare:@cf/openai/gpt-oss-20b#low",
  "cloudflare:@cf/deepseek-ai/deepseek-v4-flash-0731#low",
  "cloudflare:@cf/deepseek-ai/deepseek-v4-pro-0813#low",
  "cloudflare:@cf/moonshotai/kimi-k2.6#none",
  "cloudflare:@cf/zai-org/glm-5.3-flash#low",
  "cloudflare:@cf/zai-org/glm-5.3#low",
];

/**
 * Chosen from the 2026-10-19 screen against generator intent (not gold, so
 * provisional until the human-labelled bench). strong: fewest false
 * accusations with no failed calls, p95 ~11s. fast: p95 ~5s at ~1/5 the cost,
 * least accurate, so use it as a screen in front of strong, not alone.
 * Runner-up for strong: cloudflare:@cf/zai-org/glm-5.3#low (same precision,
 * better diagnosis, but p95 ~50s and rate-limited at concurrency 4).
 */
const DEFAULT_TIERS: Record<Tier, string> = {
  fast: "cloudflare:@cf/openai/gpt-oss-20b#low",
  strong: "cloudflare:@cf/moonshotai/kimi-k2.6#none",
};

export function parseModelRef(ref: string): ModelRef {
  const i = ref.indexOf(":");
  if (i <= 0) {
    throw new Error(`Invalid model reference "${ref}": expected "<provider>:<model>"`);
  }
  const provider = ref.slice(0, i);
  const [model, effort, ...rest] = ref.slice(i + 1).split("#");
  if (provider !== "cloudflare" && provider !== "openai-compat") {
    throw new Error(`Unknown provider "${provider}" in model reference "${ref}"`);
  }
  if (rest.length || (effort !== undefined && !REASONING_EFFORTS.includes(effort as ReasoningEffort))) {
    throw new Error(`Invalid reasoning effort in "${ref}": expected #${REASONING_EFFORTS.join("|#")}`);
  }
  return effort === undefined
    ? { provider, model, ref }
    : { provider, model, reasoningEffort: effort as ReasoningEffort, ref };
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
