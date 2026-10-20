import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAnnotator } from "@/lib/gold/guard";
import { resolveConsensus, resolveGold, type Label } from "@/lib/gold/metrics";
import {
  appendAdjudication,
  itemExists,
  listAnnotators,
  readAdjudications,
  readAnnotations,
  readItems,
  readModelLabels,
  readRules,
} from "@/lib/gold/d1";
import { annotatorFile } from "@/lib/gold/store";
import { loadTaxonomy, taxonomyCodes } from "@/lib/taxonomy";

/**
 * Items where the human label and a model label set disagree, for
 * rule-referenced adjudication at /adjudicate. The two labels are returned
 * as sides A and B in an order shuffled per adjudicator and item, so the
 * page does not show whose label is whose.
 */
export async function GET(req: NextRequest) {
  const who = await requireAnnotator(req);
  if (who instanceof NextResponse) return who;

  const adjudicator = req.nextUrl.searchParams.get("adjudicator") ?? "";
  const modelName = req.nextUrl.searchParams.get("model") ?? "";
  let model;
  try {
    annotatorFile(adjudicator);
    model = await readModelLabels(modelName);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const annotators = await listAnnotators();
  const human = new Map(await Promise.all(annotators.map(async (a) => [a, await readAnnotations(a)] as const)));
  const adjudications = await readAdjudications();
  const shuffle = (id: string) => crypto.createHash("sha256").update(`${adjudicator}:${id}`).digest()[0] % 2 === 0;

  const disputes = (await readItems()).flatMap((item) => {
    const labels = annotators.map((a) => human.get(a)!.get(item.id)).filter((a) => a !== undefined);
    const m = model.get(item.id);
    const { label: humanLabel } = resolveGold(labels);
    if (!m || !humanLabel || resolveConsensus(humanLabel, m).status !== "disputed") return [];
    const side = (source: string, l: Label & { notes?: string; rationale?: string }) => ({
      source,
      evaluation: l.evaluation,
      diagnosis_code: l.diagnosis_code,
      note: [l.notes, l.rationale].filter(Boolean).join(" — "),
    });
    const humanSide = side(
      labels.map((l) => l.annotator).join("+"),
      { ...humanLabel, notes: labels.map((l) => l.notes).filter(Boolean).join(" / ") },
    );
    const modelSide = side(modelName, m);
    const sides = shuffle(item.id) ? [humanSide, modelSide] : [modelSide, humanSide];
    return [{ id: item.id, prompt: item.prompt, response: item.response, sides, decision: adjudications.get(item.id) ?? null }];
  });

  return NextResponse.json({
    disputes,
    rules: readRules(),
    taxonomy: loadTaxonomy().map(({ code, name, domain, definition, positive_examples, negative_examples }) => ({
      code,
      name,
      domain,
      definition,
      positive_examples,
      negative_examples,
    })),
  });
}

const Body = z.object({
  adjudicator: z.string().regex(/^[a-z0-9_-]{1,40}$/),
  item_id: z.string(),
  contested: z.boolean(),
  evaluation: z.enum(["correct", "incorrect", "uncertain", "not_applicable"]),
  diagnosis_code: z.string().nullable(),
  confidence: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  rule: z.string().nullable(),
  chose: z.string().max(80),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const who = await requireAnnotator(req);
  if (who instanceof NextResponse) return who;

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }
  const a = parsed.data;
  if (!(await itemExists(a.item_id))) {
    return NextResponse.json({ error: "Unknown item" }, { status: 404 });
  }
  if (!a.contested) {
    if (!a.rule || !readRules().some((r) => r.id === a.rule)) {
      return NextResponse.json({ error: "Pick the rule that decides it, or mark it contested" }, { status: 400 });
    }
    if (a.evaluation === "incorrect" && (!a.diagnosis_code || !taxonomyCodes().has(a.diagnosis_code))) {
      return NextResponse.json({ error: "An incorrect label needs a taxonomy code (or UNKNOWN)" }, { status: 400 });
    }
  }

  const record = {
    item_id: a.item_id,
    annotator: a.adjudicator,
    evaluation: a.evaluation,
    diagnosis_code: !a.contested && a.evaluation === "incorrect" ? a.diagnosis_code : null,
    confidence: a.confidence,
    notes: a.notes?.trim() || undefined,
    contested: a.contested || undefined,
    rule: a.contested ? undefined : a.rule!,
    chose: a.chose,
    annotated_at: new Date().toISOString(),
  };
  await appendAdjudication(record, who.userId);
  return NextResponse.json({ adjudication: record });
}
