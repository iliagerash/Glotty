import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { completeStructured, GatewayError, SchemaError } from "../../src/lib/ai/gateway";

const realFetch = globalThis.fetch;
let calls: Array<Record<string, unknown>> = [];

function mockReplies(...replies: Array<{ status?: number; body: unknown }>) {
  calls = [];
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    calls.push(JSON.parse(init.body as string));
    const r = replies.shift();
    if (!r) throw new Error("unexpected call");
    const text = typeof r.body === "string" ? r.body : JSON.stringify(r.body);
    return new Response(text, { status: r.status ?? 200 });
  }) as typeof fetch;
}

const chat = (content: string) => ({
  body: { choices: [{ message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 5 } },
});

const Schema = z.object({ verdict: z.enum(["yes", "no"]) });
const opts = {
  schema: Schema,
  schemaName: "t",
  messages: [{ role: "user" as const, content: "?" }],
};

beforeEach(() => {
  process.env.CLOUDFLARE_ACCOUNT_ID = "acct";
  process.env.CLOUDFLARE_API_TOKEN = "tok";
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

test("returns validated data and sends a json_schema response_format", async () => {
  mockReplies(chat('{"verdict":"yes"}'));
  const r = await completeStructured({ ...opts, model: "cloudflare:@cf/test/a" });
  assert.deepEqual(r.data, { verdict: "yes" });
  assert.equal(r.attempts, 1);
  assert.equal((calls[0].response_format as { type: string }).type, "json_schema");
  assert.equal(calls[0].model, "@cf/test/a");
});

test("accepts a reply whose content is already a parsed object", async () => {
  mockReplies({ body: { choices: [{ message: { content: { verdict: "no" } } }] } });
  const r = await completeStructured({ ...opts, model: "cloudflare:@cf/test/obj" });
  assert.deepEqual(r.data, { verdict: "no" });
});

test("retries once with the validation error, then succeeds", async () => {
  mockReplies(chat('{"verdict":"maybe"}'), chat('{"verdict":"no"}'));
  const r = await completeStructured({ ...opts, model: "cloudflare:@cf/test/b" });
  assert.deepEqual(r.data, { verdict: "no" });
  assert.equal(r.attempts, 2);
  assert.equal(r.usage.inputTokens, 20);
  const retryMessages = calls[1].messages as Array<{ content: string }>;
  assert.match(retryMessages.at(-1)!.content, /not valid/);
});

test("fails loudly after two invalid replies", async () => {
  mockReplies(chat("nope"), chat("still nope"));
  await assert.rejects(completeStructured({ ...opts, model: "cloudflare:@cf/test/c" }), SchemaError);
});

test("drops response_format when the model rejects it", async () => {
  mockReplies({ status: 400, body: "response_format is not supported" }, chat('{"verdict":"yes"}'));
  const r = await completeStructured({ ...opts, model: "cloudflare:@cf/test/d" });
  assert.deepEqual(r.data, { verdict: "yes" });
  assert.equal(calls[1].response_format, undefined);
});

test("surfaces HTTP errors instead of falling back", async () => {
  mockReplies({ status: 500, body: "boom" });
  await assert.rejects(completeStructured({ ...opts, model: "cloudflare:@cf/test/e" }), GatewayError);
});

test("refuses to run without credentials", async () => {
  delete process.env.CLOUDFLARE_API_TOKEN;
  await assert.rejects(completeStructured({ ...opts, model: "cloudflare:@cf/test/f" }), /CLOUDFLARE_API_TOKEN/);
});

test("sends reasoning_effort from a #effort suffix and strips it from the model id", async () => {
  mockReplies(chat('{"verdict":"yes"}'));
  await completeStructured({ ...opts, model: "cloudflare:@cf/test/g#low" });
  assert.equal(calls[0].model, "@cf/test/g");
  assert.equal(calls[0].reasoning_effort, "low");
});

test("does not send reasoning_effort without a suffix", async () => {
  mockReplies(chat('{"verdict":"yes"}'));
  await completeStructured({ ...opts, model: "cloudflare:@cf/test/h" });
  assert.equal("reasoning_effort" in calls[0], false);
});

test("rejects an unknown effort suffix", async () => {
  await assert.rejects(completeStructured({ ...opts, model: "cloudflare:@cf/test/i#turbo" }), /reasoning effort/);
});

test("explains an empty reply when reasoning used the whole budget, without retrying", async () => {
  // Workers AI shape for gemma-4 / glm-4.7-flash: content null, reasoning set, finish "length".
  mockReplies({
    body: {
      choices: [{ finish_reason: "length", message: { content: null, reasoning: '{"verdict":"yes"} maybe' } }],
    },
  });
  await assert.rejects(
    completeStructured({ ...opts, model: "cloudflare:@cf/test/j" }),
    (err: Error) => err instanceof GatewayError && /reasoning used the whole max_tokens/.test(err.message),
  );
  assert.equal(calls.length, 1);
});

test("never takes the answer from the reasoning field", async () => {
  // qwen3-30b with reasoning_effort=none: finish "stop", JSON only in `reasoning_content`.
  mockReplies({
    body: { choices: [{ finish_reason: "stop", message: { content: "", reasoning_content: '{"verdict":"yes"}' } }] },
  });
  await assert.rejects(completeStructured({ ...opts, model: "cloudflare:@cf/test/k" }), /Empty completion/);
});

test("fails on truncated JSON instead of retrying into the same limit", async () => {
  mockReplies({ body: { choices: [{ finish_reason: "length", message: { content: '{"verdict":"y' } }] } });
  await assert.rejects(
    completeStructured({ ...opts, model: "cloudflare:@cf/test/l" }),
    (err: Error) => err instanceof GatewayError && /truncated/.test(err.message),
  );
  assert.equal(calls.length, 1);
});
