import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import OpenAI from "openai";
import { z } from "zod";

/**
 * The governance layer: two judge models from different model families that
 * write gold candidates and label them (what the evaluator is measured
 * against). Gold is where both judges agree. It is deliberately separate
 * from the product gateway in src/lib/ai:
 *
 * - each judge uses its provider's official SDK (OpenAI Responses API,
 *   Google Gen AI SDK), not the provider-agnostic gateway, so a judge cannot
 *   silently become one of the Workers AI models it is judging;
 * - it never runs on a learner's request path, only in offline scripts;
 * - OpenAI requests are sent with store: false.
 *
 * Judge a: OPENAI_API_KEY, GLOTTY_GOVERNANCE_MODEL, GLOTTY_GOVERNANCE_EFFORT.
 * Judge b: GEMINI_API_KEY, GLOTTY_GOVERNANCE_MODEL_B, GLOTTY_GOVERNANCE_EFFORT_B.
 *
 * Like the gateway, there is no fallback: a failure is a thrown error.
 */

export type JudgeId = "a" | "b";
export type GovernanceProvider = "openai" | "google";

const EFFORTS = {
  openai: ["none", "minimal", "low", "medium", "high", "xhigh"],
  google: ["minimal", "low", "medium", "high"],
} as const;

export interface GovernanceConfig {
  provider: GovernanceProvider;
  model: string;
  effort: string | null;
  /** "<provider>:<model>[#effort]", used in label provenance and reports. */
  ref: string;
}

export class GovernanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GovernanceError";
  }
}

const JUDGES = {
  a: { provider: "openai", key: "OPENAI_API_KEY", model: "GLOTTY_GOVERNANCE_MODEL", effort: "GLOTTY_GOVERNANCE_EFFORT" },
  b: { provider: "google", key: "GEMINI_API_KEY", model: "GLOTTY_GOVERNANCE_MODEL_B", effort: "GLOTTY_GOVERNANCE_EFFORT_B" },
} as const;

/** Reads one judge from the environment. No built-in default model. */
export function governanceConfig(judge: JudgeId = "a", env: Record<string, string | undefined> = process.env): GovernanceConfig {
  const j = JUDGES[judge];
  if (!env[j.key]) throw new GovernanceError(`${j.key} is not set (judge ${judge})`);
  const model = env[j.model]?.trim();
  if (!model) throw new GovernanceError(`${j.model} is not set (the ${j.provider} model id of judge ${judge})`);
  const effort = env[j.effort]?.trim() || null;
  const allowed: readonly string[] = EFFORTS[j.provider];
  if (effort && !allowed.includes(effort)) {
    throw new GovernanceError(`${j.effort} must be one of ${allowed.join(", ")}`);
  }
  return { provider: j.provider, model, effort, ref: `${j.provider}:${model}${effort ? `#${effort}` : ""}` };
}

/** The part of the Google client governedJson uses, so tests can pass a fake. */
export interface GoogleModels {
  models: Pick<GoogleGenAI["models"], "generateContent">;
}

let openaiClient: OpenAI | null = null;
let googleClient: GoogleGenAI | null = null;

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
  /** Defaults to judge a. */
  config?: GovernanceConfig;
  /** For tests; default clients read the API keys from the environment. */
  openai?: OpenAI;
  google?: GoogleModels;
}

export interface GovernedJsonResult<T> {
  data: T;
  ref: string;
  responseId: string;
  latencyMs: number;
  usage: { inputTokens: number | null; outputTokens: number | null };
}

interface RawResult {
  text: string;
  responseId: string;
  usage: GovernedJsonResult<unknown>["usage"];
}

async function callOpenAI(config: GovernanceConfig, opts: GovernedJsonOptions<z.ZodType>): Promise<RawResult> {
  const res = await (opts.openai ?? (openaiClient ??= new OpenAI())).responses.create({
    model: config.model,
    instructions: opts.instructions,
    input: opts.input,
    store: false,
    ...(config.effort ? { reasoning: { effort: config.effort as OpenAI.ReasoningEffort } } : {}),
    ...(opts.maxOutputTokens ? { max_output_tokens: opts.maxOutputTokens } : {}),
    text: { format: { type: "json_schema", name: opts.name, schema: opts.jsonSchema, strict: true } },
  });
  if (res.status !== "completed") {
    const reason = res.incomplete_details?.reason ?? res.error?.message ?? "no reason given";
    throw new GovernanceError(`${config.ref} returned status ${res.status} (${reason})`);
  }
  return {
    text: res.output_text,
    responseId: res.id,
    usage: { inputTokens: res.usage?.input_tokens ?? null, outputTokens: res.usage?.output_tokens ?? null },
  };
}

async function callGoogle(config: GovernanceConfig, opts: GovernedJsonOptions<z.ZodType>): Promise<RawResult> {
  const client = opts.google ?? (googleClient ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));
  const res = await client.models.generateContent({
    model: config.model,
    contents: opts.input,
    config: {
      systemInstruction: opts.instructions,
      responseMimeType: "application/json",
      responseJsonSchema: opts.jsonSchema,
      ...(config.effort ? { thinkingConfig: { thinkingLevel: config.effort.toUpperCase() as ThinkingLevel } } : {}),
      ...(opts.maxOutputTokens ? { maxOutputTokens: opts.maxOutputTokens } : {}),
    },
  });
  const blocked = res.promptFeedback?.blockReason;
  if (blocked) throw new GovernanceError(`${config.ref} blocked the prompt (${blocked})`);
  const finish = res.candidates?.[0]?.finishReason;
  if (finish !== "STOP") throw new GovernanceError(`${config.ref} finished with ${finish ?? "no candidate"}`);
  return {
    text: res.text ?? "",
    responseId: res.responseId ?? "",
    usage: {
      inputTokens: res.usageMetadata?.promptTokenCount ?? null,
      outputTokens: res.usageMetadata?.candidatesTokenCount ?? null,
    },
  };
}

export async function governedJson<S extends z.ZodType>(opts: GovernedJsonOptions<S>): Promise<GovernedJsonResult<z.infer<S>>> {
  const config = opts.config ?? governanceConfig();
  const started = Date.now();
  const raw = config.provider === "google" ? await callGoogle(config, opts) : await callOpenAI(config, opts);
  const latencyMs = Date.now() - started;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.text);
  } catch {
    throw new GovernanceError(`${config.ref} returned text that is not JSON: ${raw.text.slice(0, 200)}`);
  }
  const checked = opts.schema.safeParse(parsed);
  if (!checked.success) {
    throw new GovernanceError(`${config.ref} output failed validation: ${z.prettifyError(checked.error)}`);
  }
  return { data: checked.data, ref: config.ref, responseId: raw.responseId, latencyMs, usage: raw.usage };
}
