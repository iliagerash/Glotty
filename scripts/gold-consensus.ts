/**
 * Combines the label sets of the two governance judges into the gold
 * reference: where they agree (evaluation, and code when incorrect), that
 * label; where they disagree, "uncertain", so the evaluator should abstain.
 * Each judge's set is itself two runs combined by gold:label.
 *
 *   npm run gold:consensus -- --a <set> --b <set> [--name <set>]
 *
 * Prints inter-judge agreement against the §25 bar that applied to two human
 * annotators (κ ≥ 0.75 evaluation, ≥ 0.60 diagnosis). Below the bar the
 * consensus set is still written, but it is not fit to gate a release.
 * Use it with `npm run bench -- --against model:<name>`.
 */
import { parseArgs } from "util";
import { cohensKappa, combineRuns } from "@/lib/gold/metrics";
import { readItems, readModelLabels, writeModelLabels, type Annotation } from "@/lib/gold/store";

const { values } = parseArgs({ options: { a: { type: "string" }, b: { type: "string" }, name: { type: "string" } } });
if (!values.a || !values.b) {
  console.error("Usage: npm run gold:consensus -- --a <set> --b <set> [--name <set>]");
  process.exit(1);
}
const name = values.name ?? `${values.a}--${values.b}`;
const a = readModelLabels(values.a);
const b = readModelLabels(values.b);

const show = (l: Annotation) => `${l.evaluation}${l.diagnosis_code ? ` ${l.diagnosis_code}` : ""}`;
const both = readItems().filter((i) => a.has(i.id) && b.has(i.id));
let disagreements = 0;
const combined: Annotation[] = both.map((item) => {
  const pair = [a.get(item.id)!, b.get(item.id)!];
  const { label, split } = combineRuns(pair);
  if (split) disagreements++;
  return {
    item_id: item.id,
    annotator: name,
    ...label,
    confidence: split ? 1 : (Math.min(...pair.map((l) => l.confidence)) as 1 | 2 | 3),
    notes: split ? `judges split: ${values.a}: ${show(pair[0])} | ${values.b}: ${show(pair[1])}` : pair[0].notes,
    rationale: `[${values.a}] ${pair[0].rationale ?? ""} [${values.b}] ${pair[1].rationale ?? ""}`,
    annotated_at: new Date().toISOString(),
  };
});
writeModelLabels(name, combined);

const kEval = cohensKappa(
  both.map((i) => a.get(i.id)!.evaluation),
  both.map((i) => b.get(i.id)!.evaluation),
);
const bothIncorrect = both.filter((i) => a.get(i.id)!.evaluation === "incorrect" && b.get(i.id)!.evaluation === "incorrect");
const kDiag = cohensKappa(
  bothIncorrect.map((i) => a.get(i.id)!.diagnosis_code ?? "UNKNOWN"),
  bothIncorrect.map((i) => b.get(i.id)!.diagnosis_code ?? "UNKNOWN"),
);
const counts = combined.reduce<Record<string, number>>((acc, l) => ({ ...acc, [l.evaluation]: (acc[l.evaluation] ?? 0) + 1 }), {});
const fmt = (k: number | null) => (k === null ? "n/a" : k.toFixed(3));
const passes = kEval !== null && kEval >= 0.75 && kDiag !== null && kDiag >= 0.6;

console.log(`Consensus of ${values.a} and ${values.b} on ${both.length} items -> model_labels/${name}.jsonl: ${JSON.stringify(counts)}`);
console.log(`Judges disagree on ${disagreements} items (now uncertain).`);
console.log(`κ evaluation ${fmt(kEval)} (bar 0.75), κ diagnosis ${fmt(kDiag)} on ${bothIncorrect.length} items both call incorrect (bar 0.60).`);
console.log(
  passes
    ? "Inter-judge agreement meets the bar."
    : "Below the inter-judge bar: fine for tuning on dev, not for a release gate. Look at the disagreements (gold:model-compare) and fix the guidelines or taxonomy first.",
);
