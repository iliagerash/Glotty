import { test } from "node:test";
import assert from "node:assert/strict";
import OpenAI from "openai";
import { z } from "zod";
import { governanceConfig, governedJson, GovernanceError } from "../../src/lib/governance";

const config = { model: "judge-model", effort: "low" as const, ref: "openai:judge-model#low" };
const Schema = z.object({ evaluation: z.enum(["correct", "incorrect"]) });
const JSON_SCHEMA = { type: "object", additionalProperties: false, required: ["evaluation"], properties: { evaluation: { type: "string" } } };

function response(over: Record<string, unknown> = {}, text = '{"evaluation":"correct"}') {
  return {
    id: "resp_1",
    object: "response",
    created_at: 0,
    status: "completed",
    model: "judge-model",
    output: [{ type: "message", id: "msg_1", role: "assistant", status: "completed", content: [{ type: "output_text", text, annotations: [] }] }],
    usage: { input_tokens: 10, output_tokens: 3, total_tokens: 13, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 0 } },
    incomplete_details: null,
    error: null,
    ...over,
  };
}

function mockClient(body: unknown, seen: { request?: Record<string, unknown>; url?: string }) {
  return new OpenAI({
    apiKey: "test",
    maxRetries: 0,
    fetch: (async (url: string, init: RequestInit) => {
      seen.url = String(url);
      seen.request = JSON.parse(String(init.body));
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    }) as unknown as typeof fetch,
  });
}

const call = (openai: OpenAI) =>
  governedJson({ name: "gold_label", jsonSchema: JSON_SCHEMA, schema: Schema, instructions: "sys", input: "item", config, openai });

test("governedJson sends a strict, unstored Responses API request and validates the answer", async () => {
  const seen: { request?: Record<string, unknown>; url?: string } = {};
  const result = await call(mockClient(response(), seen));
  assert.match(seen.url!, /\/responses$/);
  assert.equal(seen.request!.model, "judge-model");
  assert.equal(seen.request!.instructions, "sys");
  assert.equal(seen.request!.input, "item");
  assert.equal(seen.request!.store, false);
  assert.deepEqual(seen.request!.reasoning, { effort: "low" });
  assert.deepEqual(seen.request!.text, { format: { type: "json_schema", name: "gold_label", schema: JSON_SCHEMA, strict: true } });
  assert.deepEqual(result.data, { evaluation: "correct" });
  assert.equal(result.ref, "openai:judge-model#low");
  assert.deepEqual(result.usage, { inputTokens: 10, outputTokens: 3 });
});

test("governedJson fails loudly on an incomplete response", async () => {
  const body = response({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" } });
  await assert.rejects(call(mockClient(body, {})), (e: Error) => e instanceof GovernanceError && /max_output_tokens/.test(e.message));
});

test("governedJson fails loudly when the answer does not match the schema", async () => {
  await assert.rejects(call(mockClient(response({}, '{"evaluation":"maybe"}'), {})), GovernanceError);
  await assert.rejects(call(mockClient(response({}, "not json"), {})), GovernanceError);
});

test("governanceConfig requires a key and a model, and validates the effort", () => {
  assert.throws(() => governanceConfig({ GLOTTY_GOVERNANCE_MODEL: "m" }), /OPENAI_API_KEY/);
  assert.throws(() => governanceConfig({ OPENAI_API_KEY: "k" }), /GLOTTY_GOVERNANCE_MODEL/);
  assert.throws(() => governanceConfig({ OPENAI_API_KEY: "k", GLOTTY_GOVERNANCE_MODEL: "m", GLOTTY_GOVERNANCE_EFFORT: "huge" }), /EFFORT/);
  assert.deepEqual(governanceConfig({ OPENAI_API_KEY: "k", GLOTTY_GOVERNANCE_MODEL: "m" }), { model: "m", effort: null, ref: "openai:m" });
  assert.equal(governanceConfig({ OPENAI_API_KEY: "k", GLOTTY_GOVERNANCE_MODEL: "m", GLOTTY_GOVERNANCE_EFFORT: "high" }).ref, "openai:m#high");
});
