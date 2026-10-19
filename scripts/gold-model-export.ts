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
  return `# Labelling instructions

You are an expert Spanish teacher and applied linguist. Label each of the ${count} learner responses in \`items.jsonl\`. The learners are adult English speakers at roughly B1 level. Each line has an \`id\`, the \`prompt\` the learner was answering, and the learner's \`response\`.

Judge every item yourself, one by one, as a teacher would. Do not write code, keyword rules or heuristics to assign labels. Label every item exactly once, even if it looks like a near-duplicate of another.

## Rules

${guidelines()}

## Diagnostic taxonomy

Use exactly one of these codes for an \`incorrect\` label. Read each code's "Is NOT this code" examples before choosing.

${renderTaxonomy()}

## Output

Return a downloadable file named \`labels.jsonl\`: one JSON object per line, one line per item, ${count} lines in total, in any order. No other text in the file.

\`\`\`json
{"item_id": "syn-0123456789", "evaluation": "incorrect", "diagnosis_code": "PI.06", "confidence": 2, "notes": "hizo -> hacía"}
\`\`\`

- \`item_id\`: the item's \`id\`, copied exactly.
- \`evaluation\`: \`correct\`, \`incorrect\`, \`uncertain\` (the label called Ambiguous above) or \`not_applicable\` (N/A).
- \`diagnosis_code\`: a code from the taxonomy (or \`UNKNOWN\`) when \`evaluation\` is \`incorrect\`; otherwise \`null\`.
- \`confidence\`: \`1\` guess, \`2\` fairly sure, \`3\` certain.
- \`notes\`: for \`incorrect\`, the corrected target word(s), e.g. \`"hizo -> hacía"\`; for \`uncertain\`, the one question you would ask the learner; otherwise \`""\`. Keep it short.

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
