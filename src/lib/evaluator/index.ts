import crypto from "crypto";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { completeStructured, type ChatMessage } from "@/lib/ai/gateway";
import { resolveModel, type ModelRef, type Tier } from "@/lib/ai/config";
import { FT_PROMPT_ID, promptHash, systemPromptFt } from "@/lib/evaluator/ft";
import { conceptTaxonomy, loadLanguage } from "@/lib/language";
import { loadTaxonomy, MVP_CLUSTERS, renderCodes, TAXONOMY_PATH, taxonomyCodes } from "@/lib/taxonomy";

/**
 * The evaluator interface (§21–§26, §36): one learner response in, one
 * three-valued, diagnosed judgement out. Versioned by prompt, taxonomy,
 * confidence floor and model so that any stored label can be traced and
 * re-scored.
 *
 * This is the asynchronous path. It never runs inside a learner's request.
 */

export const PROMPT_ID = "evaluator/v6";

/**
 * Below this confidence an "incorrect" verdict becomes an abstention (§23, §25).
 * 0.90 from replaying two runs of kimi-k2.6 on the 206-item dev split: it
 * reports 0.85, 0.9, 0.92 or 0.95 on incorrect verdicts, and keeping 0.9 is
 * where precision (0.956 averaged) and the uncertain rate (0.144) both pass;
 * 0.92 abstains too often (0.183), 0.85 accuses too often (precision 0.88).
 * It does not help gpt-oss-20b, whose false accusations come at 0.95 to 1.
 */
export const INCORRECT_MIN_CONFIDENCE = 0.9;

/**
 * The deterministic rules in postProcess, recorded in the evaluator version.
 * post/v1: the confidence floor. post/v2: a response with *por* or *para* is
 * never not_applicable.
 */
export const POSTPROCESS_ID = "post/v2";

const POR_PARA = /(?<![\p{L}])(por|para)(?![\p{L}])/iu;

export const ModelVerdictSchema = z.object({
  analysis: z.string(),
  evaluation: z.enum(["correct", "incorrect", "uncertain", "not_applicable"]),
  confidence: z.number().min(0).max(1),
  concept_ids: z.array(z.string()),
  error_span: z.string().nullable(),
  correction: z.string().nullable(),
  diagnosis_code: z.string().nullable(),
  diagnosis_confidence: z.number().min(0).max(1).nullable(),
  clarifying_question: z.string().nullable(),
  other_errors: z.array(z.string()),
});

export type ModelVerdict = z.infer<typeof ModelVerdictSchema>;

export type Evaluation = "correct" | "incorrect" | "uncertain" | "not_applicable";

export interface EvaluationInput {
  /** What the learner was responding to. Empty for an unprompted message. */
  prompt: string;
  response: string;
  /** Previous turns, oldest first, to help the evaluator infer intent. */
  context?: ChatMessage[];
}

export interface EvaluationResult {
  evaluation: Evaluation;
  evalConfidence: number;
  conceptIds: string[];
  diagnosisCode: string | null;
  diagnosisConfidence: number | null;
  errorSpan: string | null;
  correction: string | null;
  clarifyingQuestion: string | null;
  otherErrors: string[];
  analysis: string;
  /** Set when post-processing changed the model's verdict. */
  adjustment: string | null;
  evaluatorVersion: string;
  model: string;
  latencyMs: number;
  usage: { inputTokens: number | null; outputTokens: number | null };
  raw: ModelVerdict;
}

const PROMPT_PATH = path.join(process.cwd(), "prompts", "evaluator", "v6.md");

let systemPromptCache: { text: string; hash: string } | null = null;

function systemPrompt(): { text: string; hash: string } {
  if (systemPromptCache) return systemPromptCache;
  const template = fs.readFileSync(PROMPT_PATH, "utf-8");
  const text = template.replace("{{TAXONOMY}}", renderTaxonomy());
  const hash = crypto
    .createHash("sha256")
    .update(template)
    .update(fs.readFileSync(TAXONOMY_PATH))
    .digest("hex")
    .slice(0, 8);
  systemPromptCache = { text, hash };
  return systemPromptCache;
}

/** The taxonomy as the evaluator sees it; also used for model-labelling instructions. */
export function renderTaxonomy(): string {
  return renderCodes(loadTaxonomy());
}

export function evaluatorVersion(modelRef: string): string {
  return `${PROMPT_ID}+${systemPrompt().hash}~${POSTPROCESS_ID}-floor${INCORRECT_MIN_CONFIDENCE}@${modelRef}`;
}

/** The user turn the evaluator sends; also used to build fine-tuning examples. */
export function userMessage(input: EvaluationInput): string {
  const lines: string[] = [];
  if (input.context?.length) {
    lines.push("Earlier in the conversation:");
    for (const m of input.context) lines.push(`${m.role === "user" ? "Learner" : "Tutor"}: ${m.content}`);
    lines.push("");
  }
  lines.push(`Prompt shown to the learner: ${input.prompt ? JSON.stringify(input.prompt) : "(none)"}`);
  lines.push(`Learner response: ${JSON.stringify(input.response)}`);
  return lines.join("\n");
}

/**
 * Deterministic rules applied after the model answers. These encode product
 * policy, so they live in code rather than in the prompt.
 */
export function postProcess(
  raw: ModelVerdict,
  knownCodes: Set<string>,
  response = "",
): Omit<EvaluationResult, "evaluatorVersion" | "model" | "latencyMs" | "usage" | "raw"> {
  let evaluation: Evaluation = raw.evaluation;
  let diagnosisCode = raw.diagnosis_code;
  let diagnosisConfidence = raw.diagnosis_confidence;
  let adjustment: string | null = null;

  // Any por or para makes a response applicable (GUIDELINES.md). A model that
  // calls it not_applicable has flagged no error in it, so it is not incorrect.
  // Its concept_ids are kept as given, so this adds no evidence of mastery.
  if (evaluation === "not_applicable" && POR_PARA.test(response)) {
    evaluation = "correct";
    adjustment = "not_applicable with por/para in the response: correct";
  }

  if (evaluation === "incorrect" && raw.confidence < INCORRECT_MIN_CONFIDENCE) {
    evaluation = "uncertain";
    adjustment = `incorrect@${raw.confidence} below ${INCORRECT_MIN_CONFIDENCE}: abstained`;
  }

  if (evaluation === "incorrect") {
    if (!diagnosisCode || !knownCodes.has(diagnosisCode)) {
      adjustment = `diagnosis ${JSON.stringify(diagnosisCode)} not in taxonomy: UNKNOWN`;
      diagnosisCode = "UNKNOWN";
      diagnosisConfidence = null;
    }
  } else {
    diagnosisCode = null;
    diagnosisConfidence = null;
  }

  return {
    evaluation,
    evalConfidence: raw.confidence,
    conceptIds: raw.concept_ids.filter((c) => MVP_CLUSTERS.some((k) => c.startsWith(k))),
    diagnosisCode,
    diagnosisConfidence,
    errorSpan: evaluation === "incorrect" ? raw.error_span : null,
    correction: evaluation === "incorrect" ? raw.correction : null,
    clarifyingQuestion: evaluation === "uncertain" ? raw.clarifying_question : null,
    otherErrors: raw.other_errors,
    analysis: raw.analysis,
    adjustment,
  };
}

/**
 * One concept to judge (Workflow v2): the concept's key in the language pack.
 * A fine-tuned model (a "+adapter" ref) gets the v8-ft prompt for the concept
 * and its approved codes; any other model gets the long prompt plus a line
 * telling it to judge only that concept, so per-concept labels compare.
 */
export interface ConceptFocus {
  language: string;
  key: string;
}

function promptFor(model: ModelRef, focus?: ConceptFocus): { text: string; version: string; codes: Set<string> } {
  if (model.lora) {
    if (!focus) throw new Error(`${model.ref} is a fine-tuned evaluator: pass the concept to judge`);
    const pack = loadLanguage(focus.language);
    const text = systemPromptFt(pack, focus.key);
    const codes = new Set(conceptTaxonomy(pack, focus.key).map((t) => t.code));
    return { text, version: `${FT_PROMPT_ID}:${focus.language}.${focus.key}+${promptHash(text)}`, codes };
  }
  const base = systemPrompt();
  if (!focus) return { text: base.text, version: `${PROMPT_ID}+${base.hash}`, codes: taxonomyCodes() };
  const spec = loadLanguage(focus.language).concepts.find((c) => c.key === focus.key);
  if (!spec) throw new Error(`No concept "${focus.key}" in language ${focus.language}`);
  const text = `${base.text}\n\n## This response\n\nJudge only ${spec.name.toLowerCase()} (${spec.cluster}). Ignore the other cluster entirely: an error there does not make this response incorrect.`;
  return { text, version: `${PROMPT_ID}:${focus.language}.${focus.key}+${promptHash(text)}`, codes: taxonomyCodes() };
}

export async function evaluate(
  input: EvaluationInput,
  opts: { model?: Tier | string; signal?: AbortSignal; concept?: ConceptFocus } = {},
): Promise<EvaluationResult> {
  const model = resolveModel(opts.model ?? "strong");
  const prompt = promptFor(model, opts.concept);
  const result = await completeStructured({
    model: model.ref,
    schema: ModelVerdictSchema,
    schemaName: "evaluation",
    messages: [
      { role: "system", content: prompt.text },
      { role: "user", content: userMessage(input) },
    ],
    temperature: 0,
    // Headroom for reasoning models; others stop at ~200 output tokens.
    maxTokens: 4096,
    signal: opts.signal,
  });

  return {
    ...postProcess(result.data, prompt.codes, input.response),
    evaluatorVersion: `${prompt.version}~${POSTPROCESS_ID}-floor${INCORRECT_MIN_CONFIDENCE}@${model.ref}`,
    model: model.ref,
    latencyMs: result.latencyMs,
    usage: result.usage,
    raw: result.data,
  };
}
