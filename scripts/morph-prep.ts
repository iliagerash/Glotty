/**
 * Prepares COWS-L2H (https://github.com/ucdaviscl/cowsl2h) for morphological
 * annotation: one JSONL record per essay with its text, both instructor
 * corrections and the metadata the importers filter on. The corpus's id
 * column is the student; each student wrote several essays (topics, terms),
 * so an essay's id is student-topic-quarter.
 *
 *   npm run morph:prep -- --source <cowsl2h clone>
 *   python tools/morph/annotate.py --in data/morph/cowsl2h-input.jsonl \
 *       --out data/morph/cowsl2h.jsonl --fields essay,corrected1,corrected2
 *
 * Writes data/morph/cowsl2h-input.jsonl (git-ignored, like the annotations).
 */
import fs from "fs";
import path from "path";
import { parseArgs } from "util";
import { readCsv } from "@/lib/gold/csv";
import { loadLanguage } from "@/lib/language";
import { progress } from "@/lib/progress";

const OUT = path.join(process.cwd(), "data", "morph", "cowsl2h-input.jsonl");

function main() {
  const { values } = parseArgs({ options: { source: { type: "string" } } });
  if (!values.source) throw new Error("--source <path to a clone of ucdaviscl/cowsl2h> is required");
  const files = fs.readdirSync(path.join(values.source, "csv")).filter((f) => f.endsWith(".csv"));
  const bar = progress(files.length, "reading COWS-L2H");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const file of files) {
    for (const r of readCsv(path.join(values.source, "csv", file))) {
      const essay = (r.essay ?? "").trim();
      const id = `${r.id}-${(r.prompt ?? "").trim()}-${r.quarter}`;
      if (!r.id || !essay || seen.has(id)) continue;
      seen.add(id);
      out.push(
        JSON.stringify({
          id,
          student: r.id,
          topic: (r.prompt ?? "").trim(),
          quarter: r.quarter,
          course: r.course,
          l1: r["l1 language"],
          essay,
          corrected1: (r.corrected1 ?? "").trim(),
          corrected2: (r.corrected2 ?? "").trim(),
        }),
      );
    }
    bar.tick();
  }
  bar.done();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, out.join("\n") + "\n");
  console.log(`${out.length} essays -> ${path.relative(process.cwd(), OUT)}`);
  console.log(
    `Next: python tools/morph/annotate.py --model ${loadLanguage("es").spacy_model} --in ${path.relative(process.cwd(), OUT)} --out data/morph/cowsl2h.jsonl --fields essay,corrected1,corrected2`,
  );
}

main();
