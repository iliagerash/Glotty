import crypto from "crypto";
import fs from "fs";
import path from "path";
import { conceptTaxonomy, type LanguagePack } from "@/lib/language";

/**
 * The fine-tuned evaluator's prompt (Workflow v2): prompts/evaluator/v8-ft.md
 * for one concept, listing that concept's approved codes by name. Training
 * (scripts/train-build.ts) and inference (evaluate with an adapter model)
 * both use this, so the adapter sees exactly the text it was trained on.
 */
export const FT_PROMPT_ID = "evaluator/v8-ft";

export function systemPromptFt(pack: LanguagePack, conceptKey: string): string {
  const spec = pack.concepts.find((c) => c.key === conceptKey);
  if (!spec) throw new Error(`No concept "${conceptKey}" in language ${pack.code}`);
  const codes = conceptTaxonomy(pack, conceptKey).map((t) => `- ${t.code}: ${t.name}`).join("\n");
  return fs
    .readFileSync(path.join(process.cwd(), "prompts", "evaluator", "v8-ft.md"), "utf-8")
    .replaceAll("{{LANGUAGE}}", pack.name)
    .replaceAll("{{CONCEPT}}", spec.name.toLowerCase())
    .replace("{{CODES}}", codes)
    .trim();
}

/** Short hash of a rendered prompt, for the evaluator version. */
export const promptHash = (text: string) => crypto.createHash("sha256").update(text).digest("hex").slice(0, 8);
