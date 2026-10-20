/**
 * Writes the hand-off for labelling the gold candidates with an external
 * model in a chat (e.g. ChatGPT): the items without any labels, and the
 * instructions from src/lib/gold/instructions.ts. `npm run gold:label` does
 * the same through the API.
 *
 *   npm run gold:model-export [-- --out data/gold/handoff]
 *
 * Bring the result back with `npm run gold:model-import`.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { parseArgs } from "util";
import { fileInstructions } from "@/lib/gold/instructions";
import { readItems } from "@/lib/gold/store";

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
  fs.writeFileSync(path.join(outDir, "instructions.md"), fileInstructions(items.length));
  console.log(`Wrote ${items.length} items and instructions to ${path.relative(process.cwd(), outDir)}/`);
}

main();
