/**
 * Compares a model label set with each human annotator on the items both
 * labelled. This decides whether the model's labels may stand in for human
 * labels during prompt iteration on dev: the bar is the same κ a second
 * human annotator would need (§25: ≥ 0.75 binary, ≥ 0.60 diagnosis).
 *
 *   npm run gold:model-compare -- --model chatgpt-<model> [--annotator illia | model:<other>]
 *                                  [--subset tune|check]
 *
 * --annotator model:<other> compares two model label sets: the two
 * governance judges (inter-judge agreement, the bar that gates release), or
 * two runs of one model. Items they split on are usually the genuinely
 * ambiguous ones.
 *
 * --subset splits items by a fixed hash. Tune the instructions looking only
 * at `tune`; measure on `check` once, so κ is not inflated by the tuning.
 *
 * No model calls. Writes reports/gold/<model>-vs-<annotator>[-<subset>].md.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { parseArgs } from "util";
import { listAnnotators, readAnnotations, readItems, readModelLabels, type Annotation } from "@/lib/gold/store";
import { cohensKappa } from "@/lib/gold/metrics";

const EVALUATIONS: Annotation["evaluation"][] = ["correct", "incorrect", "uncertain", "not_applicable"];
const fmt = (v: number | null) => (v === null ? "n/a" : v.toFixed(3));
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

type Subset = "tune" | "check";

/** Fixed split of items for tuning instructions vs measuring them. */
export function subsetOf(itemId: string): Subset {
  return crypto.createHash("sha256").update(`tune-check:${itemId}`).digest()[0] % 2 === 0 ? "tune" : "check";
}

function readReference(ref: string): Map<string, Annotation> {
  return ref.startsWith("model:") ? readModelLabels(ref.slice("model:".length)) : readAnnotations(ref);
}

function compare(modelName: string, annotator: string, subset?: Subset): { summary: string; report: string } {
  const model = readModelLabels(modelName);
  const human = readReference(annotator);
  const items = new Map(readItems().map((i) => [i.id, i]));
  const both = [...human.keys()].filter(
    (id) => model.has(id) && items.has(id) && (!subset || subsetOf(id) === subset),
  );
  const H = (id: string) => human.get(id)!;
  const M = (id: string) => model.get(id)!;

  const agree = both.filter((id) => H(id).evaluation === M(id).evaluation).length;
  const kEval = cohensKappa(both.map((id) => H(id).evaluation), both.map((id) => M(id).evaluation));
  const bothIncorrect = both.filter((id) => H(id).evaluation === "incorrect" && M(id).evaluation === "incorrect");
  const kDiag = cohensKappa(
    bothIncorrect.map((id) => H(id).diagnosis_code ?? "-"),
    bothIncorrect.map((id) => M(id).diagnosis_code ?? "-"),
  );
  // The costly direction for the product: the model calls wrong what the human calls right.
  const overAccuse = both.filter((id) => M(id).evaluation === "incorrect" && H(id).evaluation !== "incorrect").length;
  const underAccuse = both.filter((id) => H(id).evaluation === "incorrect" && M(id).evaluation !== "incorrect").length;

  const passEval = kEval !== null && kEval >= 0.75;
  const passDiag = kDiag === null || kDiag >= 0.6;
  const verdict = !both.length
    ? "No overlapping items."
    : annotator.startsWith("model:")
      ? passEval && passDiag
        ? `Model vs model: meets the agreement bar. For two different judges, this is the inter-judge κ the gates require; for two runs of one model, it is consistency only.`
        : `Model vs model: below the agreement bar. Review the disagreements below; items the two sets split on are candidates for Ambiguous.`
      : passEval && passDiag
      ? `Meets the human-agreement bar. ${modelName} may stand in for human labels during prompt iteration on dev; held-out reports still need human labels.`
      : `Below the human-agreement bar. Do not use ${modelName} as a stand-in for human labels; review the disagreements below first.`;

  const lines = [
    `# ${modelName} vs ${annotator}${subset ? ` (${subset} subset)` : ""}`,
    "",
    `Overlap: ${both.length} items (${annotator} labelled ${human.size}, ${modelName} labelled ${model.size}).`,
    "",
    "| Measure | Value | Bar |",
    "|---|---|---|",
    `| Raw agreement on evaluation | ${both.length ? fmt(agree / both.length) : "n/a"} | |`,
    `| κ evaluation | ${fmt(kEval)} | ≥ 0.75 |`,
    `| κ diagnosis, both incorrect (n=${bothIncorrect.length}) | ${fmt(kDiag)} | ≥ 0.60 |`,
    `| Model says incorrect, ${annotator} does not | ${overAccuse} | |`,
    `| ${annotator} says incorrect, model does not | ${underAccuse} | |`,
    "",
    `**${verdict}**`,
    "",
    `## Confusion (rows: ${annotator}, columns: ${modelName})`,
    "",
    `| | ${EVALUATIONS.join(" | ")} |`,
    `|---|${EVALUATIONS.map(() => "---").join("|")}|`,
    ...EVALUATIONS.map(
      (h) => `| ${h} | ${EVALUATIONS.map((m) => both.filter((id) => H(id).evaluation === h && M(id).evaluation === m).length).join(" | ")} |`,
    ),
    "",
  ];

  const differ = both.filter(
    (id) => H(id).evaluation !== M(id).evaluation || H(id).diagnosis_code !== M(id).diagnosis_code,
  );
  if (differ.length) {
    lines.push(
      "## Disagreements",
      "",
      `| Item | Response | ${annotator} | ${modelName} |`,
      "|---|---|---|---|",
      ...differ.map((id) => {
        const show = (a: Annotation) =>
          cell(
            `${a.evaluation} ${a.diagnosis_code ?? ""} (c${a.confidence})${a.notes ? `: ${a.notes}` : ""}${a.rationale ? ` — ${a.rationale}` : ""}`,
          );
        return `| ${id} | ${cell(items.get(id)!.response)} | ${show(H(id))} | ${show(M(id))} |`;
      }),
      "",
    );
  }

  const summary = `${modelName} vs ${annotator}${subset ? ` [${subset}]` : ""}: overlap ${both.length}, κ evaluation ${fmt(kEval)}, κ diagnosis ${fmt(kDiag)} (n=${bothIncorrect.length}), model over-accuses ${overAccuse}. ${verdict}`;
  return { summary, report: lines.join("\n") };
}

function main() {
  const { values } = parseArgs({
    options: { model: { type: "string" }, annotator: { type: "string" }, subset: { type: "string" } },
  });
  const subset = values.subset as Subset | undefined;
  if (subset && subset !== "tune" && subset !== "check") {
    console.error(`Unknown --subset "${subset}": use tune or check`);
    process.exit(1);
  }
  if (!values.model) {
    console.error("Usage: npm run gold:model-compare -- --model chatgpt-<model> [--annotator illia]");
    process.exit(1);
  }
  const annotators = values.annotator ? [values.annotator] : listAnnotators();
  if (!annotators.length) {
    console.error("No human annotations in data/gold/annotations/.");
    process.exit(1);
  }
  const outDir = path.join(process.cwd(), "reports", "gold");
  fs.mkdirSync(outDir, { recursive: true });
  for (const a of annotators) {
    const { summary, report } = compare(values.model, a, subset);
    const file = path.join(outDir, `${values.model}-vs-${a.replace(/[^a-zA-Z0-9.-]+/g, "_")}${subset ? `-${subset}` : ""}.md`);
    fs.writeFileSync(file, report);
    console.log(`${summary}\nReport: ${path.relative(process.cwd(), file)}`);
  }
}

main();
