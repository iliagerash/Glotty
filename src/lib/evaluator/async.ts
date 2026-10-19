import fs from "fs";
import path from "path";
import { getEvaluatorProvider, ModelProvider } from "@/lib/llm/gateway";

export type EvaluationLabel = "correct" | "incorrect" | "uncertain";

export interface AsyncEvaluationResult {
  evaluation: EvaluationLabel;
  evalConfidence: number;
  diagnosisCode: string | null;
  diagnosisConfidence: number | null;
  rationale: string;
  evaluatorVersion: string;
  evalPath: "async";
  latencyMs: number;
  /**
   * "ok" when the model produced a usable label. "unavailable" (no provider
   * configured) and "error" (call or parse failed) both carry an UNCERTAIN
   * label with zero confidence and must never be counted as a measurement.
   */
  status: "ok" | "unavailable" | "error";
}

/** Bump whenever the prompt or post-processing changes (§33 versioned labels). */
export const ASYNC_PROMPT_VERSION = "diag-v2";

/** Below this the evaluator abstains rather than asserting INCORRECT (§21, §25). */
export const INCORRECT_MIN_CONFIDENCE = 0.7;

interface TaxonomyEntry {
  code: string;
  domain: string;
  [key: string]: unknown;
}

function loadTaxonomy(): TaxonomyEntry[] {
  const taxPath = path.join(process.cwd(), "data", "taxonomy", "mvp_taxonomy.json");
  if (fs.existsSync(taxPath)) {
    return JSON.parse(fs.readFileSync(taxPath, "utf-8"));
  }
  return [];
}

const taxonomy = loadTaxonomy();

function buildSystemPrompt(conceptId: string, relevantTaxonomy: TaxonomyEntry[]): string {
  return `
You are Glotty's Expert Applied Linguistic Evaluator for B1 Spanish.
Your core duty is charitable interpretation under uncertainty.
False accusation of error is a trust-killing defect. A sentence like "Ayer iba al supermercado y compré leche" is COMPLETELY VALID Spanish (backgrounding the journey). Do not force mechanical rules.
If the learner's intent is ambiguous or cannot be reliably determined from the text, you MUST abstain and output "uncertain".
Judge only the concept cluster below; ignore unrelated errors (spelling, agreement, vocabulary).

Concept Cluster: ${conceptId}

Diagnostic Taxonomy:
${JSON.stringify(relevantTaxonomy, null, 2)}

You must return valid JSON with this exact schema:
{
  "evaluation": "correct" | "incorrect" | "uncertain",
  "eval_confidence": number between 0.0 and 1.0,
  "diagnosis_code": one of the taxonomy codes above, "UNKNOWN", or null if correct/uncertain,
  "diagnosis_confidence": number between 0.0 and 1.0 or null,
  "rationale": string concise explanation
}
`;
}

function buildUserPrompt(prompt: string, rawResponse: string): string {
  // JSON-encode learner text so quotes or instructions in it can't break the frame.
  return `
Prompt shown to learner: ${JSON.stringify(prompt)}
Learner's response: ${JSON.stringify(rawResponse)}

Analyze whether the response is grammatically and aspectually/semantically appropriate, or if it demonstrates one of the defined misconceptions in the taxonomy.
`;
}

function unscored(
  status: "unavailable" | "error",
  rationale: string,
  evaluatorVersion: string,
  startTime: number
): AsyncEvaluationResult {
  return {
    evaluation: "uncertain",
    evalConfidence: 0,
    diagnosisCode: null,
    diagnosisConfidence: null,
    rationale,
    evaluatorVersion,
    evalPath: "async",
    latencyMs: Math.round(performance.now() - startTime),
    status,
  };
}

function toConfidence(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(1, Math.max(0, value));
}

/**
 * Turns raw model output into a label, enforcing the evaluator's contract
 * instead of trusting the model: unknown labels become UNCERTAIN, codes must
 * belong to the concept's taxonomy, and low-confidence INCORRECT abstains.
 */
export function interpretModelOutput(
  raw: unknown,
  allowedCodes: Set<string>
): Pick<
  AsyncEvaluationResult,
  "evaluation" | "evalConfidence" | "diagnosisCode" | "diagnosisConfidence" | "rationale"
> {
  const out = (raw ?? {}) as Record<string, unknown>;
  const rationale = typeof out.rationale === "string" ? out.rationale : "";
  const evalConfidence = toConfidence(out.eval_confidence) ?? 0;

  const label = out.evaluation;
  if (label !== "correct" && label !== "incorrect" && label !== "uncertain") {
    return {
      evaluation: "uncertain",
      evalConfidence: 0,
      diagnosisCode: null,
      diagnosisConfidence: null,
      rationale: `Model returned unrecognized evaluation ${JSON.stringify(label)}. ${rationale}`.trim(),
    };
  }

  if (label !== "incorrect") {
    return { evaluation: label, evalConfidence, diagnosisCode: null, diagnosisConfidence: null, rationale };
  }

  if (evalConfidence < INCORRECT_MIN_CONFIDENCE) {
    return {
      evaluation: "uncertain",
      evalConfidence,
      diagnosisCode: null,
      diagnosisConfidence: null,
      rationale: `Abstained: INCORRECT at confidence ${evalConfidence.toFixed(2)} is below ${INCORRECT_MIN_CONFIDENCE}. ${rationale}`.trim(),
    };
  }

  const code = typeof out.diagnosis_code === "string" ? out.diagnosis_code : null;
  const validCode = code !== null && allowedCodes.has(code);
  return {
    evaluation: "incorrect",
    evalConfidence,
    diagnosisCode: validCode ? code : "UNKNOWN",
    diagnosisConfidence: validCode ? toConfidence(out.diagnosis_confidence) : null,
    rationale,
  };
}

/**
 * Asynchronous LLM-based diagnostic evaluator (§22).
 * Never fabricates a label: with no provider, or on any failure, it returns
 * UNCERTAIN with zero confidence and a non-"ok" status.
 */
export async function evaluateAsync(
  prompt: string,
  rawResponse: string,
  conceptId: string,
  provider: ModelProvider | null = getEvaluatorProvider()
): Promise<AsyncEvaluationResult> {
  const startTime = performance.now();

  if (!provider) {
    return unscored(
      "unavailable",
      "No evaluator model configured; response left unscored.",
      `async-unavailable-${ASYNC_PROMPT_VERSION}`,
      startTime
    );
  }

  const evaluatorVersion = `async-${provider.id}:${provider.model}-${ASYNC_PROMPT_VERSION}`;
  const relevantTaxonomy = taxonomy.filter((t) => t.domain === conceptId || t.domain === "all");
  const allowedCodes = new Set(relevantTaxonomy.map((t) => t.code));
  allowedCodes.add("UNKNOWN");

  try {
    const raw = await provider.completeJson({
      system: buildSystemPrompt(conceptId, relevantTaxonomy),
      user: buildUserPrompt(prompt, rawResponse),
      temperature: 0.1,
    });

    return {
      ...interpretModelOutput(raw, allowedCodes),
      evaluatorVersion,
      evalPath: "async",
      latencyMs: Math.round(performance.now() - startTime),
      status: "ok",
    };
  } catch (error) {
    console.error(`Async evaluation via ${provider.id}:${provider.model} failed:`, error);
    const message = error instanceof Error ? error.message : String(error);
    return unscored("error", `Evaluator call failed: ${message}`, evaluatorVersion, startTime);
  }
}
