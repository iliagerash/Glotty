import OpenAI from "openai";
import { z } from "zod";

/**
 * The governance layer: the model that writes gold candidates and labels them
 * (the judge the evaluator is measured against). It is deliberately separate
 * from the product gateway in src/lib/ai:
 *
 * - it uses the official OpenAI SDK and the Responses API, not the
 *   provider-agnostic gateway, so the judge cannot silently become one of the
 *   Workers AI models it is judging;
 * - it never runs on a learner's request path, only in offline scripts;
 * - requests are sent with store: false.
 *
 * Like the gateway, there is no fallback: a failure is a thrown error.
 */

export type GovernanceEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
const EFFORTS: GovernanceEffort[] = ["none", "minimal", "low", "medium", "high", "xhigh"];

export interface GovernanceConfig {
  model: string;
  effort: GovernanceEffort | null;
  /** "openai:<model>[#effort]", used in label provenance and reports. */
  ref: string;
}

export class GovernanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GovernanceError";
  }
}

/** Reads the governance model from the environment. No built-in default. */
export function governanceConfig(env: Record<string, string | undefined> = process.env): GovernanceConfig {
  if (!env.OPENAI_API_KEY) throw new GovernanceError("OPENAI_API_KEY is not set");
  const model = env.GLOTTY_GOVERNANCE_MODEL?.trim();
  if (!model) throw new GovernanceError("GLOTTY_GOVERNANCE_MODEL is not set (e.g. the OpenAI model id of the judge)");
  const raw = env.GLOTTY_GOVERNANCE_EFFORT?.trim() || null;
  if (raw && !EFFORTS.includes(raw as GovernanceEffort)) {
    throw new GovernanceError(`GLOTTY_GOVERNANCE_EFFORT must be one of ${EFFORTS.join(", ")}`);
  }
  const effort = raw as GovernanceEffort | null;
  return { model, effort, ref: `openai:${model}${effort ? `#${effort}` : ""}` };
}

let defaultClient: OpenAI | null = null;
function client(): OpenAI {
  defaultClient ??= new OpenAI();
  return defaultClient;
}

export interface GovernedJsonOptions<S extends z.ZodType> {
  /** Name of the structured output, e.g. "gold_label". */
  name: string;
  /** Strict JSON schema sent to the API (all properties required, no extras). */
  jsonSchema: Record<string, unknown>;
  /** The same shape as zod, checked again on our side. */
  schema: S;
  instructions: string;
  input: string;
  maxOutputTokens?: number;
  config?: GovernanceConfig;
  /** For tests; defaults to a client reading OPENAI_API_KEY. */
  openai?: OpenAI;
}

export interface GovernedJsonResult<T> {
  data: T;
  ref: string;
  responseId: string;
  latencyMs: number;
  usage: { inputTokens: number | null; outputTokens: number | null };
}

export async function governedJson<S extends z.ZodType>(opts: GovernedJsonOptions<S>): Promise<GovernedJsonResult<z.infer<S>>> {
  const config = opts.config ?? governanceConfig();
  const started = Date.now();
  const res = await (opts.openai ?? client()).responses.create({
    model: config.model,
    instructions: opts.instructions,
    input: opts.input,
    store: false,
    ...(config.effort ? { reasoning: { effort: config.effort } } : {}),
    ...(opts.maxOutputTokens ? { max_output_tokens: opts.maxOutputTokens } : {}),
    text: { format: { type: "json_schema", name: opts.name, schema: opts.jsonSchema, strict: true } },
  });
  const latencyMs = Date.now() - started;

  if (res.status !== "completed") {
    const reason = res.incomplete_details?.reason ?? res.error?.message ?? "no reason given";
    throw new GovernanceError(`${config.ref} returned status ${res.status} (${reason})`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(res.output_text);
  } catch {
    throw new GovernanceError(`${config.ref} returned text that is not JSON: ${res.output_text.slice(0, 200)}`);
  }
  const checked = opts.schema.safeParse(parsed);
  if (!checked.success) {
    throw new GovernanceError(`${config.ref} output failed validation: ${z.prettifyError(checked.error)}`);
  }
  return {
    data: checked.data,
    ref: config.ref,
    responseId: res.id,
    latencyMs,
    usage: { inputTokens: res.usage?.input_tokens ?? null, outputTokens: res.usage?.output_tokens ?? null },
  };
}
