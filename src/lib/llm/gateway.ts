import { GeminiProvider } from "./gemini";

/**
 * Provider-agnostic model gateway (§36).
 * Callers depend on ModelProvider only; the concrete provider and model are
 * chosen from the environment so they can be swapped without code changes.
 */

export interface JsonCompletionRequest {
  system: string;
  user: string;
  temperature?: number;
}

export interface ModelProvider {
  /** Provider family, e.g. "gemini". */
  readonly id: string;
  /** Concrete model identifier sent to the provider. */
  readonly model: string;
  /** Returns the parsed JSON object produced by the model. Throws on failure. */
  completeJson(req: JsonCompletionRequest): Promise<unknown>;
}

const DEFAULT_PROVIDER = "gemini";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

function isConfigured(value: string | undefined): value is string {
  return !!value && value.trim() !== "" && !value.startsWith("your_");
}

/**
 * Returns the provider used by the async diagnostic evaluator, or null when
 * none is configured. Callers must treat null as "evaluator unavailable" and
 * must never substitute a heuristic in its place.
 *
 * Env:
 *   GLOTTY_LLM_PROVIDER  provider family (default "gemini")
 *   GLOTTY_EVAL_MODEL    model id (default "gemini-2.5-flash")
 *   GEMINI_API_KEY       credentials for the gemini provider
 */
export function getEvaluatorProvider(): ModelProvider | null {
  const provider = process.env.GLOTTY_LLM_PROVIDER?.trim() || DEFAULT_PROVIDER;

  switch (provider) {
    case "gemini": {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!isConfigured(apiKey)) return null;
      const model = process.env.GLOTTY_EVAL_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
      return new GeminiProvider(apiKey, model);
    }
    default:
      throw new Error(`Unknown GLOTTY_LLM_PROVIDER "${provider}"`);
  }
}
