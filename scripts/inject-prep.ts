/**
 * Prepares Tatoeba Spanish-English sentence pairs for error injection
 * (Workflow v2, step 4), from the ManyThings.org export of Tatoeba
 * (https://www.manythings.org/anki/spa-eng.zip, CC BY 2.0 FR: each line keeps
 * its attribution). One JSONL record per distinct Spanish sentence of 5-25
 * words, with its English translation.
 *
 *   npm run inject:prep -- --source <path to spa.txt from spa-eng.zip>
 *   python tools/morph/annotate.py --model es_core_news_lg --in data/morph/tatoeba-input.jsonl \
 *       --out data/morph/tatoeba.jsonl --fields es
 *
 * Writes data/morph/tatoeba-input.jsonl (git-ignored, like the annotations).
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { parseArgs } from "util";
import { loadLanguage } from "@/lib/language";

const OUT = path.join(process.cwd(), "data", "morph", "tatoeba-input.jsonl");

function main() {
  const { values } = parseArgs({ options: { source: { type: "string" } } });
  if (!values.source) throw new Error("--source <path to spa.txt from https://www.manythings.org/anki/spa-eng.zip> is required");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of fs.readFileSync(values.source, "utf-8").split("\n")) {
    const [en, es, attribution] = line.split("\t");
    if (!en || !es) continue;
    const words = es.trim().split(/\s+/).length;
    const key = es.trim().toLowerCase();
    if (words < 5 || words > 25 || seen.has(key)) continue;
    seen.add(key);
    const id = `tatoeba-${crypto.createHash("sha256").update(key).digest("hex").slice(0, 12)}`;
    out.push(JSON.stringify({ id, en: en.trim(), es: es.trim(), attribution: (attribution ?? "").trim() }));
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, out.join("\n") + "\n");
  console.log(`${out.length} Spanish sentences -> ${path.relative(process.cwd(), OUT)}`);
  console.log(`Next: python tools/morph/annotate.py --model ${loadLanguage("es").spacy_model} --in ${path.relative(process.cwd(), OUT)} --out data/morph/tatoeba.jsonl --fields es`);
}

main();
