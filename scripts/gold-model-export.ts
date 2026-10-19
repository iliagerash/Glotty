/**
 * Writes the hand-off for labelling the gold candidates with an external
 * model (e.g. ChatGPT): the items without any labels, and instructions built
 * from GUIDELINES.md and the taxonomy so they stay in sync with what human
 * annotators and the evaluator follow.
 *
 *   npm run gold:model-export [-- --out data/gold/handoff]
 *
 * Bring the result back with `npm run gold:model-import`.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { parseArgs } from "util";
import { renderTaxonomy } from "@/lib/evaluator";
import { GOLD_DIR, readItems } from "@/lib/gold/store";

/** Bump when the instructions change, and put it in the imported set's name. */
const INSTRUCTIONS_VERSION = 3;

/** Sections of GUIDELINES.md that only concern the /annotate workflow. */
const SKIP_SECTIONS = ["Independence", "Splits"];

function guidelines(): string {
  const text = fs.readFileSync(path.join(GOLD_DIR, "GUIDELINES.md"), "utf-8");
  const sections = text.split(/^(?=## )/m);
  return sections
    .slice(1) // drop the title and the /annotate preamble
    .filter((s) => !SKIP_SECTIONS.some((name) => s.startsWith(`## ${name}`)))
    .join("")
    .replace(/^## /gm, "### ")
    .trim();
}

function instructions(count: number): string {
  return `# Labelling instructions (version ${INSTRUCTIONS_VERSION})

You are an expert Spanish teacher and applied linguist. Label each of the ${count} learner responses in \`items.jsonl\`. The learners are adult English speakers at roughly B1 level. Each line has an \`id\`, the \`prompt\` the learner was answering, and the learner's \`response\`.

Judge every item yourself, one by one, as a teacher would. Do not write code, keyword rules or heuristics to assign labels. Label every item exactly once, even if it looks like a near-duplicate of another.

## How to judge one item

1. Find every target form: each preterite or imperfect verb, and each *por* or *para*. If there are none, the label is N/A.
2. For each target form, ask what the learner could plausibly have meant, using the prompt as context. Write down every natural reading, not just the first one that comes to mind.
3. Decide:
   - every target form fits at least one natural reading, and no natural reading needs a different form → **Correct**;
   - some target form is wrong under every natural reading → **Incorrect**;
   - some target form is right under one natural reading and wrong under another, and the prompt does not settle which → **Ambiguous**.
4. Only then look at anything else in the sentence. Errors outside the two clusters never change the label: gender agreement, accents, vocabulary, word order, a choice among other prepositions (*a*, *de*, *en*, *con*), reflexive pronouns, or a sentence you would simply phrase differently. A sentence can be clumsy and still be Correct. One exception: a *por* or *para* where Spanish needs a different preposition or none at all is a por/para error (Incorrect; PP.06 when English "for" explains it, otherwise UNKNOWN).

## Ambiguous is a normal answer

Ambiguous is a legitimate label, not a failure to decide. Do not resolve an ambiguity by picking the reading that makes the learner right, nor the one that makes them wrong. Use Ambiguous when both readings are natural for a B1 learner answering this prompt.

- *Cuando vivía en Madrid, fui al Prado.* Ambiguous: a single visit makes *fui* correct; a habit ("I used to go") needs *iba*. Ask: *¿Fuiste una vez o ibas a menudo?*
- *Trabajé por mi padre el verano pasado.* Ambiguous: "in his place" makes *por* correct; "for him as my employer" needs *para*. Ask: *¿Trabajaste en su lugar o en su empresa?*
- *De niño, fui al Prado todos los domingos.* Not ambiguous: *todos los domingos* makes it a habit, so *fui* is Incorrect (PI.04).
- *Gracias por la cena, estuvo buenísima.* Not ambiguous: a bounded evaluation of a finished meal, Correct.

## Confidence

- **3 (certain):** any trained Spanish teacher would give the same label, and you cannot construct a natural reading that changes it.
- **2 (fairly sure):** you would defend the label, but a colleague could reasonably disagree, or a less likely reading changes it.
- **1 (guess):** you could argue it either way.

Use 3 only when it is earned. In a set like this one, many items should be 2.

## Rules

${guidelines()}

## Diagnostic taxonomy

Use exactly one of these codes for an \`incorrect\` label. Read each code's "Is NOT this code" examples before choosing.

${renderTaxonomy()}

## Output

Return a downloadable file named \`labels.jsonl\`: one JSON object per line, one line per item, ${count} lines in total, in any order. No other text in the file.

\`\`\`json
{"item_id": "syn-0123456789", "evaluation": "incorrect", "diagnosis_code": "PI.06", "confidence": 2, "notes": "hizo -> hacía", "rationale": "hizo frío sets the scene for the entrance; no natural reading makes it a step in the sequence."}
\`\`\`

- \`item_id\`: the item's \`id\`, copied exactly.
- \`evaluation\`: \`correct\`, \`incorrect\`, \`uncertain\` (the label called Ambiguous above) or \`not_applicable\` (N/A).
- \`diagnosis_code\`: a code from the taxonomy (or \`UNKNOWN\`) when \`evaluation\` is \`incorrect\`; otherwise \`null\`.
- \`confidence\`: \`1\` guess, \`2\` fairly sure, \`3\` certain.
- \`notes\`: for \`incorrect\`, the corrected target word(s), e.g. \`"hizo -> hacía"\`; for \`uncertain\`, the one question you would ask the learner; otherwise \`""\`. Keep it short.
- \`rationale\`: one sentence for every item: the target forms and the reading(s) you considered.

If you cannot finish all ${count} items in one reply, continue in further replies until every item has a line, then give the complete file.
`;
}

function main() {
  const { values } = parseArgs({ options: { out: { type: "string", default: path.join("data", "gold", "handoff") } } });
  const outDir = path.resolve(values.out!);
  fs.mkdirSync(outDir, { recursive: true });

  // A fixed shuffle, so near-identical items written together don't sit side by side.
  const order = (id: string) => crypto.createHash("sha256").update(`handoff:${id}`).digest("hex");
  const items = readItems().sort((a, b) => order(a.id).localeCompare(order(b.id)));

  fs.writeFileSync(
    path.join(outDir, "items.jsonl"),
    items.map((i) => JSON.stringify({ id: i.id, prompt: i.prompt, response: i.response })).join("\n") + "\n",
  );
  fs.writeFileSync(path.join(outDir, "instructions.md"), instructions(items.length));
  console.log(`Wrote ${items.length} items and instructions to ${path.relative(process.cwd(), outDir)}/`);
}

main();
