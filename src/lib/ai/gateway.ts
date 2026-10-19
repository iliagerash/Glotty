import { z } from "zod";
import { resolveModel, type ModelRef, type Tier } from "./config";
import { extractJson } from "./json";

/**
 * The model gateway (§36). Every LLM call in Glotty goes through here.
 *
 * - No product code is tied to a provider: callers pass a tier or a model ref.
 * - Structured calls are validated against a zod schema. A response that does
 *   not validate is retried once with the validation error, then fails loudly.
 * - There is no silent fallback. A failure is a thrown error, and the caller
 *   decides whether that means "uncertain", "retry later" or "abort".
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  model: Tier | string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface CompletionResult {
  text: string;
  model: ModelRef;
  latencyMs: number;
  usage: { inputTokens: number | null; outputTokens: number | null };
  /** "stop", "length", ... as reported by the provider; null if absent. */
  finishReason: string | null;
}

export interface StructuredResult<T> extends CompletionResult {
  data: T;
  /** Number of attempts used, 1 or 2. */
  attempts: number;
}

export class GatewayError extends Error {
  constructor(
    message: string,
    readonly model: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

export class SchemaError extends Error {
  constructor(
    message: string,
    readonly model: string,
    readonly rawText: string,
  ) {
    super(message);
    this.name = "SchemaError";
  }
}

interface Endpoint {
  url: string;
  headers: Record<string, string>;
}

function endpointFor(model: ModelRef): Endpoint {
  if (model.provider === "cloudflare") {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const token = process.env.CLOUDFLARE_API_TOKEN;
    if (!accountId || !token) {
      throw new GatewayError(
        "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set",
        model.ref,
      );
    }
    return {
      url: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`,
      headers: { Authorization: `Bearer ${token}` },
    };
  }
  const baseUrl = process.env.OPENAI_COMPAT_BASE_URL;
  const key = process.env.OPENAI_COMPAT_API_KEY;
  if (!baseUrl || !key) {
    throw new GatewayError(
      "OPENAI_COMPAT_BASE_URL and OPENAI_COMPAT_API_KEY must be set",
      model.ref,
    );
  }
  return {
    url: `${baseUrl.replace(/\/$/, "")}/chat/completions`,
    headers: { Authorization: `Bearer ${key}` },
  };
}

/** Models that rejected `response_format` once; we stop sending it to them. */
const noResponseFormat = new Set<string>();

async function callChat(
  model: ModelRef,
  opts: Omit<CompletionOptions, "model">,
  responseFormat?: object,
): Promise<CompletionResult> {
  const endpoint = endpointFor(model);
  const body: Record<string, unknown> = {
    model: model.model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0,
    max_tokens: opts.maxTokens ?? 1024,
  };
  if (model.reasoningEffort) body.reasoning_effort = model.reasoningEffort;
  const useFormat = responseFormat && !noResponseFormat.has(model.ref);
  if (useFormat) body.response_format = responseFormat;

  const started = performance.now();
  let res: Response;
  try {
    res = await fetch(endpoint.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...endpoint.headers },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (err) {
    throw new GatewayError(`Request failed: ${(err as Error).message}`, model.ref);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // Some models do not support structured output. Retry once without it;
    // the prompt still asks for JSON and the schema still validates.
    if (useFormat && res.status === 400 && /response_format|json_schema/i.test(detail)) {
      noResponseFormat.add(model.ref);
      return callChat(model, opts);
    }
    throw new GatewayError(
      `HTTP ${res.status}: ${detail.slice(0, 500)}`,
      model.ref,
      res.status,
    );
  }

  const json = (await res.json()) as {
    choices?: Array<{
      finish_reason?: string | null;
      // Workers AI uses `reasoning` for some models and `reasoning_content` for others.
      message?: { content?: string | null; reasoning?: string | null; reasoning_content?: string | null };
    }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const choice = json.choices?.[0];
  const text = choice?.message?.content ?? "";
  const finishReason = choice?.finish_reason ?? null;
  if (!text) {
    const reasoning = choice?.message?.reasoning || choice?.message?.reasoning_content;
    // Reasoning text is never used as the answer: it holds drafts, not a verdict.
    const why =
      finishReason === "length" && reasoning
        ? `reasoning used the whole max_tokens budget (${body.max_tokens}); raise maxTokens or lower the effort (#low)`
        : `finish_reason ${finishReason ?? "missing"}${reasoning ? ", reasoning only" : ""}`;
    throw new GatewayError(`Empty completion: ${why}`, model.ref, res.status);
  }
  return {
    text,
    model,
    latencyMs: Math.round(performance.now() - started),
    usage: {
      inputTokens: json.usage?.prompt_tokens ?? null,
      outputTokens: json.usage?.completion_tokens ?? null,
    },
    finishReason,
  };
}

export async function complete(opts: CompletionOptions): Promise<CompletionResult> {
  const model = resolveModel(opts.model);
  return callChat(model, opts);
}

/**
 * A completion whose output must match `schema`. The JSON Schema is sent as
 * `response_format` where the model supports it, and the zod schema is the
 * final check either way.
 */
export async function completeStructured<S extends z.ZodType>(
  opts: CompletionOptions & { schema: S; schemaName: string },
): Promise<StructuredResult<z.infer<S>>> {
  const model = resolveModel(opts.model);
  const responseFormat = {
    type: "json_schema",
    json_schema: { name: opts.schemaName, schema: z.toJSONSchema(opts.schema), strict: true },
  };

  let messages = opts.messages;
  let latencyMs = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let lastText = "";
  let lastError = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = await callChat(model, { ...opts, messages }, responseFormat);
    latencyMs += result.latencyMs;
    inputTokens += result.usage.inputTokens ?? 0;
    outputTokens += result.usage.outputTokens ?? 0;
    lastText = result.text;

    const candidate = extractJson(result.text);
    const parsed = candidate === undefined ? null : opts.schema.safeParse(candidate);
    if (parsed?.success) {
      return {
        ...result,
        data: parsed.data,
        attempts: attempt,
        latencyMs,
        usage: { inputTokens, outputTokens },
      };
    }
    if (result.finishReason === "length") {
      // A retry would hit the same limit; say so instead.
      throw new GatewayError(
        `Output truncated at max_tokens (${opts.maxTokens ?? 1024}) before valid JSON; raise maxTokens or lower the effort`,
        model.ref,
      );
    }
    lastError =
      candidate === undefined
        ? "The reply did not contain a JSON object."
        : z.prettifyError(parsed!.error);
    messages = [
      ...opts.messages,
      { role: "assistant", content: result.text },
      {
        role: "user",
        content: `Your reply was not valid. ${lastError}\nReply again with only the corrected JSON object.`,
      },
    ];
  }
  throw new SchemaError(`Invalid structured output: ${lastError}`, model.ref, lastText);
}
