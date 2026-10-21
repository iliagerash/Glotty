/**
 * Step 2 of Workflow v2: drafts taxonomy v2 for each concept of a language,
 * bottom-up from real learner errors, with a governance judge (a, OpenAI, by
 * default).
 *
 *   npm run taxonomy:draft [-- --language es] [--concept pret_imp] [--sample 200] [--judge a|b]
 *   npm run taxonomy:draft -- --review data/taxonomy/es/review-v2-claude.md   (a revision round)
 *
 * For each concept, the judge gets real instructor-corrected errors from the
 * training pool (data/train/<corpus>-pool.jsonl; never the anchor sets), the
 * v1 codes for that concept and the v1 taxonomy review, and returns contrast
 * codes in the taxonomy format plus the code it gives each sample error, so
 * coverage and frequency are visible. Codes describe one semantic contrast
 * readable from one response; patterns across responses (L1 transfer, no
 * system at all) are left to the learner model; ABSTAIN is not a code.
 * With --review, it is a revision: the drafter also gets its previous draft
 * (the existing draft-v2-<concept>-<model>.json) and an independent review,
 * and is asked to address every point or say why not. The previous draft is
 * kept as draft-v2-<concept>-<model>.prev.json.
 * Writes data/taxonomy/<language>/draft-v2-<concept>-<model>.json and .md.
 */
import "dotenv/config";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { parseArgs } from "util";
import { z } from "zod";
import { governanceConfig, governedJson, type JudgeId } from "@/lib/governance";
import { loadLanguage } from "@/lib/language";
import { waiting } from "@/lib/progress";
import { loadTaxonomy } from "@/lib/taxonomy";
import type { PoolItem } from "./train-export";

const Code = z.object({
  code: z.string(),
  name: z.string(),
  definition: z.string(),
  positive_examples: z.array(z.string()),
  negative_examples: z.array(z.string()),
  distinguishing_probe: z.string(),
  intervention_family: z.string(),
});
const Draft = z.object({
  summary: z.string(),
  codes: z.array(Code),
  assignments: z.array(z.object({ i: z.number().int(), code: z.string(), why: z.string() })),
  left_out: z.string(),
});
const str = { type: "string" };
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "codes", "assignments", "left_out"],
  properties: {
    summary: str,
    codes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["code", "name", "definition", "positive_examples", "negative_examples", "distinguishing_probe", "intervention_family"],
        properties: {
          code: str,
          name: str,
          definition: str,
          positive_examples: { type: "array", items: str },
          negative_examples: { type: "array", items: str },
          distinguishing_probe: str,
          intervention_family: str,
        },
      },
    },
    assignments: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["i", "code", "why"], properties: { i: { type: "integer" }, code: str, why: str } },
    },
    left_out: str,
  },
};

const REVISION = `

This is a revision round. You also get your previous draft (previous_draft) and an independent review of it by another expert (review), which may cover several concepts: use the parts about this concept. Address every point the review makes about this concept: apply it, or keep your version and say why in the summary. The error sample may have changed since the previous draft (duplicates removed, corrections an expert judged acceptable removed), so assign every error again.`;

function instructions(language: string, conceptName: string, prefix: string): string {
  return `You are an expert in second language acquisition of ${language} and in designing diagnostic error taxonomies for language tutoring. Design version 2 of the taxonomy for one concept, "${conceptName}", bottom up from the real learner errors you are given.

How the codes are used: an evaluator reads one short response from a learner, decides whether the ${conceptName} choices are right, and for an error gives ONE code. The code is a contrast: which meaning distinction the learner got wrong in this response. Patterns that only show across many responses (L1 transfer, no system at all, avoidance) are NOT codes: a separate learner model infers them from a learner's history of contrasts. When no code fits, the evaluator abstains; that is not a code either.

Each code must:
- name one meaning contrast a Spanish teacher would recognise and teach (for example "a habit told as a single completed event"), covering errors in either direction only if both directions call for the same practice;
- be assignable from the response and its prompt alone, and be distinguishable from every other code;
- lead to practice different from the other codes (intervention_family);
- be supported by the errors given: do not add a code no error shows unless it is a standard, frequent contrast for learners at this level, and say so in its definition.

The errors come from instructor corrections of learner essays (all levels, mostly English speakers). Some corrections are a teacher's preference rather than a clear error; do not build a code on those. Each error has an index i, the task prompt, the response (two sentences), and the instructor's change(s) to the target form.

Return:
- codes: ${prefix}.01, ${prefix}.02, ... in a sensible order. Keep the set small (usually 5-8). For each: a short name; a definition that says when to use it AND when not to; 2-4 positive_examples (learner sentences with the error and the correction in brackets, e.g. "Cuando fui niño [era], ..."), preferably adapted from the errors given; 2-3 negative_examples (correct look-alikes that are NOT this error, with why); a distinguishing_probe (a short exercise that separates it from its nearest neighbour code); an intervention_family (snake_case name of the practice it leads to).
- assignments: for EVERY error index, the code you give it, or "NONE" when no code fits (it is not a ${conceptName} error, the correction is a preference, or the meaning is unclear), with a few words why.
- summary: how the codes partition the errors, and how they differ from the v1 codes.
- left_out: patterns you saw but did not make codes, and why.

The v1 codes and an independent review of them are given for reference. Do not copy them; keep what the evidence supports and fix what the review found.`;
}

async function main() {
  const { values } = parseArgs({
    options: {
      language: { type: "string", default: "es" },
      concept: { type: "string" },
      corpus: { type: "string", default: "cowsl2h" },
      sample: { type: "string", default: "200" },
      review: { type: "string" },
      judge: { type: "string", default: "a" },
    },
  });
  if (values.judge !== "a" && values.judge !== "b") throw new Error("--judge must be a or b");
  const config = governanceConfig(values.judge as JudgeId);
  const pack = loadLanguage(values.language!);
  const pool = fs
    .readFileSync(path.join(process.cwd(), "data", "train", `${values.corpus}-pool.jsonl`), "utf-8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l) as PoolItem);
  const reviewFile = path.join(process.cwd(), "data", "taxonomy", "review-gpt-6-luna.json");
  const review = fs.existsSync(reviewFile) ? JSON.parse(fs.readFileSync(reviewFile, "utf-8")) : null;
  const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
  const outDir = path.join(process.cwd(), "data", "taxonomy", pack.code);
  fs.mkdirSync(outDir, { recursive: true });

  for (const spec of pack.concepts.filter((c) => !values.concept || c.key === values.concept)) {
    const errors = pool
      .filter((p) => p.language === pack.code && p.concept === spec.key && p.kind === "error")
      .sort((a, b) => hash(a.id).localeCompare(hash(b.id)))
      .slice(0, Number(values.sample));
    const sample = errors.map((p, i) => ({
      i,
      prompt: p.prompt,
      response: p.response,
      instructor_changed: p.findings.map((f) => `${f.from} -> ${f.to}`),
      level: p.level,
      l1: p.l1,
    }));
    const v1 = loadTaxonomy().filter((t) => t.domain === spec.cluster);
    const name = config.model.toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
    const base = path.join(outDir, `draft-v2-${spec.key}-${name}`);
    const revision = values.review
      ? { previous: JSON.parse(fs.readFileSync(`${base}.json`, "utf-8")), review: fs.readFileSync(values.review, "utf-8") }
      : null;
    if (revision) fs.copyFileSync(`${base}.json`, `${base}.prev.json`);
    const v1Review = review?.codes?.filter((c: { code: string }) => v1.some((t) => t.code === c.code)) ?? [];
    console.log(`${spec.key}: ${sample.length} real errors, ${v1.length} v1 codes, sending to ${config.ref}.`);

    const { data } = await waiting(
      `${spec.key} draft`,
      governedJson({
        config,
        name: "taxonomy_draft",
        jsonSchema: SCHEMA,
        schema: Draft,
        instructions: instructions(pack.name, spec.name, spec.code_prefix) + (revision ? REVISION : ""),
        input: JSON.stringify({
          errors: sample,
          v1_codes: v1,
          v1_review: { overall: review?.overall, codes: v1Review },
          ...(revision ? { previous_draft: { summary: revision.previous.summary, codes: revision.previous.taxonomy, left_out: revision.previous.left_out }, review: revision.review } : {}),
        }),
      }),
    );

    // Coverage: how many sample errors each code got, and which got none.
    const counts = new Map<string, number>();
    for (const a of data.assignments) counts.set(a.code, (counts.get(a.code) ?? 0) + 1);
    const unassigned = sample.length - new Set(data.assignments.map((a) => a.i)).size;
    const taxonomy = data.codes.map((c) => ({ ...c, domain: spec.cluster }));
    fs.writeFileSync(
      `${base}.json`,
      JSON.stringify({ drafted_by: config.ref, drafted_at: new Date().toISOString(), concept: spec.key, summary: data.summary, left_out: data.left_out, taxonomy, assignments: data.assignments, sample }, null, 2) + "\n",
    );
    const examples = (code: string, n = 3) =>
      data.assignments.filter((a) => a.code === code).slice(0, n).map((a) => `  - ${sample[a.i]?.response} *(${sample[a.i]?.instructor_changed.join("; ")})* — ${a.why}`);
    const md = [
      `# Taxonomy v2 draft: ${spec.name} (${spec.cluster})`,
      "",
      `Drafted ${new Date().toISOString().slice(0, 10)} by ${config.ref} with \`npm run taxonomy:draft\` from ${sample.length} real instructor-corrected errors (training pool)${revision ? `, revised against the review in \`${path.relative(process.cwd(), values.review!)}\` (previous draft: \`${path.basename(base)}.prev.json\`)` : ""}. Not approved.`,
      "",
      "## Summary",
      "",
      data.summary,
      "",
      "## Coverage of the sample",
      "",
      "| Code | Name | Errors |",
      "| --- | --- | --- |",
      ...data.codes.map((c) => `| ${c.code} | ${c.name} | ${counts.get(c.code) ?? 0} |`),
      `| NONE | no code fits | ${counts.get("NONE") ?? 0} |`,
      ...(unassigned ? ["", `${unassigned} sample errors got no assignment at all.`] : []),
      "",
      "## Codes",
      "",
      ...data.codes.flatMap((c) => [
        `### ${c.code}: ${c.name}`,
        "",
        c.definition,
        "",
        `**Is this code:** ${c.positive_examples.join(" | ")}`,
        "",
        `**Is not this code:** ${c.negative_examples.join(" | ")}`,
        "",
        `**Probe:** ${c.distinguishing_probe}`,
        "",
        `**Practice:** \`${c.intervention_family}\``,
        "",
        "Sample errors given this code:",
        ...examples(c.code),
        "",
      ]),
      "## No code (NONE)",
      "",
      ...examples("NONE", 12),
      "",
      "## Left out",
      "",
      data.left_out,
      "",
    ].join("\n");
    fs.writeFileSync(`${base}.md`, md);
    console.log(`  ${data.codes.length} codes; NONE ${counts.get("NONE") ?? 0}; wrote ${path.relative(process.cwd(), base)}.md and .json`);
  }
}

main();
