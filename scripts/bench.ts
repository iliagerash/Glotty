/**
 * Evaluator benchmark (§24, §25). Runs real model calls; there is no offline
 * fallback. Writes predictions and a markdown report to reports/bench/<run>.
 *
 *   npm run bench -- [--models fast,strong,cloudflare:@cf/...] [--split dev|heldout|all]
 *                    [--against gold|intent|model:<name>] [--consensus <name>]
 *                    [--limit 50] [--concurrency 4]
 *
 * --against intent scores against what the candidate generator *meant* to
 * produce. Use it only to screen models before annotation exists; the report
 * is marked as not a gold measurement.
 *
 * --against model:<name> scores against an imported model label set
 * (data/gold/model_labels/<name>.jsonl). Use it for prompt iteration on dev
 * only after gold:model-compare shows the set agrees with human labels.
 *
 * --consensus <name> (with --against gold) is for when only one human
 * annotator exists: an item is gold when the human label agrees with the
 * model label set, or when a disagreement has been adjudicated at
 * /adjudicate. Disputed and contested items are left out and counted.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { parseArgs } from "util";
import { evaluate, type EvaluationResult } from "@/lib/evaluator";
import { resolveModel } from "@/lib/ai/config";
import {
  listAnnotators,
  readAdjudications,
  readAnnotations,
  readGeneratorIntent,
  readItems,
  readModelLabels,
  splitOf,
  type GoldItem,
} from "@/lib/gold/store";
import {
  cohensKappa,
  evaluatorGates,
  evaluatorMetrics,
  percentile,
  resolveConsensus,
  resolveGold,
  type ConsensusStatus,
  type GoldStatus,
  type Label,
  type ScoredRow,
} from "@/lib/gold/metrics";

interface Labeled {
  item: GoldItem;
  gold: Label;
}

function goldLabels(items: GoldItem[], consensusModel?: string) {
  const annotators = listAnnotators();
  const byAnnotator = new Map(annotators.map((a) => [a, readAnnotations(a)]));
  const adjudications = readAdjudications();
  const model = consensusModel ? readModelLabels(consensusModel) : null;
  const counts: Partial<Record<GoldStatus | ConsensusStatus, number>> = {};
  const labeled: Labeled[] = [];
  for (const item of items) {
    const labels = annotators
      .map((a) => byAnnotator.get(a)!.get(item.id))
      .filter((a) => a !== undefined);
    const { label, status } = model
      ? resolveConsensus(resolveGold(labels).label, model.get(item.id), adjudications.get(item.id))
      : resolveGold(labels, adjudications.get(item.id));
    counts[status] = (counts[status] ?? 0) + 1;
    if (label) labeled.push({ item, gold: label });
  }
  return { labeled, counts, annotators, byAnnotator };
}

function agreementSection(
  items: GoldItem[],
  annotators: string[],
  byAnnotator: Map<string, ReturnType<typeof readAnnotations>>,
): string[] {
  if (annotators.length < 2) {
    return [
      "## Inter-annotator agreement",
      "",
      `Not measurable: ${annotators.length} annotator(s). The κ gates (§25: ≥ 0.75 binary, ≥ 0.60 diagnosis) need a second independent annotator on overlapping items.`,
      "",
    ];
  }
  const out = ["## Inter-annotator agreement", "", "| Pair | Overlap | κ evaluation (≥ 0.75) | κ diagnosis (≥ 0.60) |", "|---|---|---|---|"];
  for (let i = 0; i < annotators.length; i++) {
    for (let j = i + 1; j < annotators.length; j++) {
      const A = byAnnotator.get(annotators[i])!;
      const B = byAnnotator.get(annotators[j])!;
      const both = items.filter((it) => A.has(it.id) && B.has(it.id));
      const kEval = cohensKappa(both.map((it) => A.get(it.id)!.evaluation), both.map((it) => B.get(it.id)!.evaluation));
      const bothIncorrect = both.filter(
        (it) => A.get(it.id)!.evaluation === "incorrect" && B.get(it.id)!.evaluation === "incorrect",
      );
      const kDiag = cohensKappa(
        bothIncorrect.map((it) => A.get(it.id)!.diagnosis_code ?? "-"),
        bothIncorrect.map((it) => B.get(it.id)!.diagnosis_code ?? "-"),
      );
      out.push(`| ${annotators[i]} × ${annotators[j]} | ${both.length} | ${fmt(kEval)} | ${fmt(kDiag)} (n=${bothIncorrect.length}) |`);
    }
  }
  return [...out, ""];
}

const fmt = (v: number | null, digits = 3) => (v === null ? "n/a" : v.toFixed(digits));

async function runModel(model: string, rows: Labeled[], concurrency: number, outDir: string) {
  const results: Array<{ row: Labeled; result: EvaluationResult | null; error: string | null }> = [];
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < rows.length) {
      const row = rows[next++];
      try {
        const result = await evaluate({ prompt: row.item.prompt, response: row.item.response }, { model });
        results.push({ row, result, error: null });
      } catch (err) {
        results.push({ row, result: null, error: `${(err as Error).name}: ${(err as Error).message}` });
      }
      done++;
      if (done % 10 === 0 || done === rows.length) process.stdout.write(`  ${model}: ${done}/${rows.length}\r`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, worker));
  process.stdout.write("\n");

  const file = path.join(outDir, `${model.replace(/[^a-zA-Z0-9.-]+/g, "_")}.jsonl`);
  fs.writeFileSync(
    file,
    results
      .map(({ row, result, error }) =>
        JSON.stringify({
          item_id: row.item.id,
          source: row.item.source,
          response: row.item.response,
          gold: row.gold,
          pred: result && { evaluation: result.evaluation, diagnosis_code: result.diagnosisCode },
          confidence: result?.evalConfidence,
          analysis: result?.analysis,
          adjustment: result?.adjustment,
          evaluator_version: result?.evaluatorVersion,
          latency_ms: result?.latencyMs,
          usage: result?.usage,
          error,
        }),
      )
      .join("\n") + "\n",
  );
  return results;
}

async function main() {
  const { values } = parseArgs({
    options: {
      models: { type: "string", default: "fast,strong" },
      split: { type: "string", default: "dev" },
      against: { type: "string", default: "gold" },
      limit: { type: "string" },
      concurrency: { type: "string", default: "4" },
      consensus: { type: "string" },
    },
  });
  const split = values.split as "dev" | "heldout" | "all";
  const against = values.against!;
  if (against !== "gold" && against !== "intent" && !against.startsWith("model:")) {
    console.error(`Unknown --against "${against}": use gold, intent or model:<name>`);
    process.exit(1);
  }
  const models = values.models!.split(",").map((m) => resolveModel(m.trim()).ref);

  const items = readItems().filter((i) => split === "all" || splitOf(i.id) === split);
  let labeled: Labeled[];
  const header: string[] = [];
  if (against === "intent") {
    const intent = readGeneratorIntent();
    labeled = items
      .filter((i) => intent.has(i.id))
      .map((item) => ({ item, gold: intent.get(item.id)! }));
    header.push(
      "> **Not a gold measurement.** Scored against the candidate generator's intended labels, which no human has checked. Use only to screen models before annotation.",
      "",
    );
  } else if (against.startsWith("model:")) {
    const name = against.slice("model:".length);
    const silver = readModelLabels(name);
    labeled = items.filter((i) => silver.has(i.id)).map((item) => ({ item, gold: silver.get(item.id)! }));
    header.push(
      `> **Not a gold measurement.** Scored against labels written by a model (\`${name}\`), not by humans. Valid for prompt iteration on dev only if \`npm run gold:model-compare -- --model ${name}\` shows it agrees with human labels. Held-out reports need human labels.`,
      "",
    );
  } else {
    const g = goldLabels(items, values.consensus);
    labeled = g.labeled;
    header.push(
      `Gold status of ${items.length} items in split: ${Object.entries(g.counts).map(([k, v]) => `${k} ${v}`).join(", ")}.`,
      "",
      ...agreementSection(items, g.annotators, g.byAnnotator),
    );
    if (values.consensus) {
      header.push(
        `> **Provisional gold.** One human annotator checked against model labels (\`${values.consensus}\`): items where they agree, plus adjudicated disagreements. Agreed items skew easier than disputed ones, so these numbers flatter the evaluator. No native-speaker check yet.`,
        "",
      );
    } else if (g.annotators.length < 2) {
      header.push("> Gold labels come from a single annotator. Treat results as provisional until κ is measured.", "");
    }
  }
  if (values.limit) labeled = labeled.slice(0, Number(values.limit));
  if (!labeled.length) {
    console.error(`No labelled items for split=${split} against=${against}. Annotate at /annotate first, or use --against intent.`);
    process.exit(1);
  }
  if (split === "heldout") {
    console.log("Held-out run. Report these numbers; do not iterate prompts on them (§24).");
  }

  const labelsTag = values.consensus ? `${against}+${values.consensus}` : against;
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${split}-${labelsTag.replace(/[^a-zA-Z0-9.-]+/g, "_")}`;
  const outDir = path.join(process.cwd(), "reports", "bench", runId);
  fs.mkdirSync(outDir, { recursive: true });

  const report: string[] = [`# Evaluator benchmark ${runId}`, "", `Split: **${split}**. Labels: **${labelsTag}**. Items: ${labeled.length}.`, "", ...header];
  const summary: string[] = [
    "## Summary",
    "",
    "| Model | Accuracy ≥0.90 | Precision INCORRECT ≥0.95 | Diagnosis top-1 ≥0.65 | UNCERTAIN ≤0.15 | False accusations | Wrong N/A | Failures | p50 / p95 ms | Avg tokens in/out |",
    "|---|---|---|---|---|---|---|---|---|---|",
  ];
  const details: string[] = [];

  for (const model of models) {
    console.log(`Running ${model} on ${labeled.length} items...`);
    const results = await runModel(model, labeled, Number(values.concurrency), outDir);
    const scored: ScoredRow[] = results.map(({ row, result }) => ({
      gold: row.gold,
      pred: result && { evaluation: result.evaluation, diagnosis_code: result.diagnosisCode },
    }));
    const m = evaluatorMetrics(scored);
    const gates = evaluatorGates(m);
    const ok = results.filter((r) => r.result).map((r) => r.result!);
    const lat = ok.map((r) => r.latencyMs);
    const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
    const mark = (g: (typeof gates)[number]) => `${fmt(g.value)} ${g.pass === null ? "" : g.pass ? "✅" : "❌"}`;

    summary.push(
      `| \`${model}\` | ${gates.map(mark).join(" | ")} | ${m.falseAccusations} | ${m.wrongNotApplicable} | ${m.failures} | ${percentile(lat, 50) ?? "-"} / ${percentile(lat, 95) ?? "-"} | ${avg(ok.map((r) => r.usage.inputTokens ?? 0))} / ${avg(ok.map((r) => r.usage.outputTokens ?? 0))} |`,
    );

    details.push(`## \`${model}\``, "");
    details.push(
      `Binary n=${m.binaryN}, diagnosis n=${m.diagnosisN}, predicted INCORRECT=${m.predictedIncorrect}, recall on INCORRECT=${fmt(m.recallIncorrect)}.`,
      "",
    );
    const bySource = new Map<string, ScoredRow[]>();
    results.forEach(({ row }, i) => {
      const list = bySource.get(row.item.source) ?? [];
      list.push(scored[i]);
      bySource.set(row.item.source, list);
    });
    if (bySource.size > 1) {
      details.push("| Source | n | Accuracy | Precision INCORRECT | UNCERTAIN |", "|---|---|---|---|---|");
      for (const [source, rows] of bySource) {
        const sm = evaluatorMetrics(rows);
        details.push(`| ${source} | ${rows.length} | ${fmt(sm.binaryAccuracy)} | ${fmt(sm.precisionIncorrect)} | ${fmt(sm.uncertainRate)} |`);
      }
      details.push("");
    }
    const wrong = results.filter(
      ({ row, result }) =>
        result && (result.evaluation !== row.gold.evaluation || result.diagnosisCode !== row.gold.diagnosis_code),
    );
    if (wrong.length) {
      details.push("<details><summary>Disagreements with labels</summary>", "", "| Item | Response | Label | Evaluator | Analysis |", "|---|---|---|---|---|");
      for (const { row, result } of wrong) {
        const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
        details.push(
          `| ${row.item.id} | ${cell(row.item.response)} | ${row.gold.evaluation} ${row.gold.diagnosis_code ?? ""} | ${result!.evaluation} ${result!.diagnosisCode ?? ""} (${result!.evalConfidence}) | ${cell(result!.analysis)} |`,
        );
      }
      details.push("", "</details>", "");
    }
    const failures = results.filter((r) => r.error);
    if (failures.length) {
      console.error(`  ${failures.length} failed calls for ${model}. First: ${failures[0].error!.slice(0, 300)}`);
      process.exitCode = 1;
      details.push(`Failures (${failures.length}), first: \`${failures[0].error!.slice(0, 200)}\``, "");
    }
  }

  fs.writeFileSync(path.join(outDir, "report.md"), [...report, ...summary, "", ...details].join("\n"));
  console.log(summary.join("\n"));
  console.log(`\nReport: ${path.relative(process.cwd(), path.join(outDir, "report.md"))}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
