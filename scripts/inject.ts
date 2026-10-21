/**
 * Error injection for training (Workflow v2, step 4): native Spanish sentences
 * from Tatoeba, with one target form swapped to its counterpart, kept only
 * when a governance judge (a, OpenAI, by default) says the swap is a clear
 * error for the sentence's English meaning, and coded against the concept's
 * approved taxonomy in the same call.
 *
 *   npm run inject [-- --language es] [--per-concept 700] [--concurrency 4]
 *
 * Needs data/morph/tatoeba*.jsonl (npm run inject:prep, then
 * tools/morph/annotate.py). For each concept, candidates are sentences with
 * exactly one target form of that concept: a word-swap concept swaps the
 * word (por <-> para); a feature-swap concept on preterite/imperfect
 * generates the same verb in the other aspect (src/lib/gold/conjugate.ts),
 * skipping verbs it cannot conjugate safely. --per-concept candidates are
 * sampled deterministically. Each item's prompt is the translation task
 * ("Traduce al español: «…»"), so the intended meaning is in the item.
 *
 * Judgements are cached in data/train/inject-judged.jsonl (resumable). Writes
 * data/train/inject-pool.jsonl: an error item per clear error, with its code,
 * and a correct item per original sentence. Training only; never the anchors.
 */
import "dotenv/config";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { parseArgs } from "util";
import { z } from "zod";
import { conceptsFor } from "@/lib/gold/concepts";
import { otherAspect, type Num, type Person } from "@/lib/gold/conjugate";
import { readAnnotations, textOf, type Token } from "@/lib/gold/morph";
import { governanceConfig, governedJson, type JudgeId } from "@/lib/governance";
import { conceptTaxonomy, loadLanguage, type ConceptSpec, type LanguagePack } from "@/lib/language";
import { progress } from "@/lib/progress";
import { renderCodes } from "@/lib/taxonomy";

const MORPH = path.join(process.cwd(), "data", "morph");
const TRAIN = path.join(process.cwd(), "data", "train");
const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

interface Candidate {
  key: string;
  sentence: string;
  concept: string;
  en: string;
  original: string;
  altered: string;
  from: string;
  to: string;
  attribution: string;
}

const matchCase = (word: string, like: string) => (like[0] === like[0].toUpperCase() ? word[0].toUpperCase() + word.slice(1) : word);

/** The swapped form of the one target token, or null if this concept can't make a safe swap. */
function swap(spec: ConceptSpec, t: Token): string | null {
  if (spec.detector === "word-swap") {
    const others = spec.words.filter((w) => w.toLowerCase() !== t.text.toLowerCase());
    return others.length === 1 ? matchCase(others[0], t.text) : null;
  }
  // feature-swap: only preterite <-> imperfect is generated so far.
  if (spec.feature !== "Tense" || !spec.values.includes("Past") || !spec.values.includes("Imp")) return null;
  const person = Number(t.feats.Person) as Person;
  const num = t.feats.Number as Num;
  if (![1, 2, 3].includes(person) || (num !== "Sing" && num !== "Plur")) return null;
  const form = otherAspect(t.lemma, t.feats.Tense as "Past" | "Imp", person, num);
  return form && form.toLowerCase() !== t.text.toLowerCase() ? matchCase(form, t.text) : null;
}

const Result = z.object({
  verdict: z.enum(["clear_error", "acceptable", "unclear"]),
  diagnosis_code: z.string(),
  error_span: z.string(),
  correction: z.string(),
  analysis: z.string(),
});
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "diagnosis_code", "error_span", "correction", "analysis"],
  properties: {
    verdict: { type: "string", enum: ["clear_error", "acceptable", "unclear"] },
    diagnosis_code: { type: "string" },
    error_span: { type: "string" },
    correction: { type: "string" },
    analysis: { type: "string" },
  },
};

const instructions = (pack: LanguagePack, conceptName: string, codes: string) => `You are an expert ${pack.name} teacher. You get the English meaning of a sentence, a correct ${pack.name} version, and an altered version in which one ${conceptName} choice was swapped. Decide whether the altered version, read as a learner's attempt to say the English meaning, contains a ${conceptName} error:
- clear_error: on the natural reading of the English meaning, the swapped form is wrong; a careful native teacher would mark it.
- acceptable: the swapped form is also natural, acceptable ${pack.name} for this meaning (aspect and prepositions are often a free choice of viewpoint).
- unclear: the meaning does not decide it, or the altered sentence is broken in another way.
For clear_error, also give the code below that names the contrast the learner got wrong (NONE if no code fits), error_span (the swapped word, exactly as in the altered sentence), correction (the original word) and analysis (1-2 sentences in English, as a teacher would explain it to the learner, without mentioning that the sentence was altered). Otherwise use NONE and empty strings.

## Codes for ${conceptName}

${codes}`;

async function main() {
  const { values } = parseArgs({
    options: {
      language: { type: "string", default: "es" },
      "per-concept": { type: "string", default: "700" },
      judge: { type: "string", default: "a" },
      concurrency: { type: "string", default: "4" },
    },
  });
  if (values.judge !== "a" && values.judge !== "b") throw new Error("--judge must be a or b");
  const config = governanceConfig(values.judge as JudgeId);
  const pack = loadLanguage(values.language!);
  const concepts = conceptsFor(pack.code);
  const sources = new Map(
    fs.readFileSync(path.join(MORPH, "tatoeba-input.jsonl"), "utf-8").trim().split("\n").map((l) => JSON.parse(l)).map((r) => [r.id, r]),
  );
  const tokens = readAnnotations(path.join(MORPH, "tatoeba.jsonl"));

  // Phase 1: candidates, sentences with exactly one target form of the concept.
  const candidates: Candidate[] = [];
  for (const spec of pack.concepts) {
    const concept = concepts[spec.key];
    const found: Candidate[] = [];
    const bar = progress(tokens.size, `${spec.key}: candidates`);
    for (const [id, fields] of tokens) {
      bar.tick();
      const toks = fields.es ?? [];
      const targets = toks.filter(concept.isTarget);
      if (targets.length !== 1) continue;
      const to = swap(spec, targets[0]);
      if (!to) continue;
      const src = sources.get(id);
      const altered = textOf(toks.map((t) => (t === targets[0] ? { ...t, text: to } : t)));
      found.push({ key: `${id}|${spec.key}`, sentence: id, concept: spec.key, en: src.en, original: src.es, altered, from: to, to: targets[0].text, attribution: src.attribution });
    }
    bar.done();
    const picked = found.sort((a, b) => hash(a.key).localeCompare(hash(b.key))).slice(0, Number(values["per-concept"]));
    console.log(`${spec.key}: ${found.length} candidate sentences, ${picked.length} sampled.`);
    candidates.push(...picked);
  }

  // Phase 2: judge and code (cached).
  const cacheFile = path.join(TRAIN, "inject-judged.jsonl");
  const cache = new Map<string, z.infer<typeof Result> & { key: string; judge: string }>(
    fs.existsSync(cacheFile) ? fs.readFileSync(cacheFile, "utf-8").trim().split("\n").filter(Boolean).map((l) => [JSON.parse(l).key, JSON.parse(l)]) : [],
  );
  const conceptInfo = new Map(
    pack.concepts.map((c) => {
      const codes = conceptTaxonomy(pack, c.key);
      return [c.key, { valid: new Set(codes.map((t) => t.code)), instructions: instructions(pack, c.name, renderCodes(codes)) }];
    }),
  );
  const todo = candidates.filter((c) => !cache.has(c.key));
  console.log(`Judging ${todo.length} swaps with ${config.ref} (${candidates.length - todo.length} cached).`);
  const bar = progress(todo.length, "judged");
  let next = 0;
  let failed = 0;
  async function worker() {
    while (next < todo.length) {
      const c = todo[next++];
      try {
        const { data } = await governedJson({
          config,
          name: "inject_judge",
          jsonSchema: SCHEMA,
          schema: Result,
          instructions: conceptInfo.get(c.concept)!.instructions,
          input: JSON.stringify({ english_meaning: c.en, correct_version: c.original, altered_version: c.altered, swapped: `${c.to} -> ${c.from}` }),
        });
        const code = conceptInfo.get(c.concept)!.valid.has(data.diagnosis_code) ? data.diagnosis_code : "NONE";
        const row = { key: c.key, ...data, diagnosis_code: code, judge: config.ref };
        fs.appendFileSync(cacheFile, JSON.stringify(row) + "\n");
        cache.set(c.key, row);
        bar.tick();
      } catch (err) {
        failed++;
        console.error(`\n  ${c.key}: ${(err as Error).message.slice(0, 200)}`);
        bar.tick(false);
      }
    }
  }
  await Promise.all(Array.from({ length: Number(values.concurrency) }, worker));
  bar.done();
  if (failed) {
    console.error(`${failed} failed; nothing written. Re-run to retry them.`);
    process.exitCode = 1;
    return;
  }

  // Phase 3: the injected pool. One error item per clear error, one correct item per original sentence.
  const out: object[] = [];
  const tally = new Map<string, number>();
  const correctDone = new Set<string>();
  for (const c of candidates) {
    const j = cache.get(c.key)!;
    tally.set(`${c.concept} ${j.verdict}`, (tally.get(`${c.concept} ${j.verdict}`) ?? 0) + 1);
    const base = { language: pack.code, concept: c.concept, prompt: `Traduce al español: «${c.en}»`, essay: c.sentence, student: "tatoeba", l1: [] as string[], level: null, source: "tatoeba", attribution: c.attribution };
    if (j.verdict === "clear_error") {
      out.push({
        ...base,
        id: `inject-${hash(c.key + c.altered).slice(0, 12)}`,
        response: c.altered,
        kind: "error",
        findings: [{ concept: c.concept, from: c.from, to: c.to }],
        untouched: [],
        code: { diagnosis_code: j.diagnosis_code, error_span: j.error_span || c.from, correction: j.correction || c.to, analysis: j.analysis },
      });
    }
    if (!correctDone.has(c.key)) {
      correctDone.add(c.key);
      out.push({ ...base, id: `inject-${hash(c.key + c.original).slice(0, 12)}`, response: c.original, kind: "correct", findings: [], untouched: [c.to] });
    }
  }
  const file = path.join(TRAIN, "inject-pool.jsonl");
  fs.writeFileSync(file, out.map((o) => JSON.stringify(o)).join("\n") + "\n");
  console.log([...tally].sort().map(([k, v]) => `${k}: ${v}`).join(", "));
  const codes = new Map<string, number>();
  for (const o of out as { kind: string; code?: { diagnosis_code: string } }[]) if (o.kind === "error") codes.set(o.code!.diagnosis_code, (codes.get(o.code!.diagnosis_code) ?? 0) + 1);
  console.log(`Error items by code: ${[...codes].sort().map(([k, v]) => `${k} ${v}`).join(", ")}`);
  console.log(`${out.length} items -> ${path.relative(process.cwd(), file)}`);
}

main();
