import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { goldAdjudications, goldAnnotations, goldItems, goldModelLabels } from "@/db/schema";
import rules from "../../../data/gold/rules.json";
import {
  normalizeResponse,
  type AdjudicationRecord,
  type Annotation,
  type GoldItem,
  type ItemSource,
  type Rule,
} from "@/lib/gold/store";

/**
 * The gold set as the app sees it, in D1. Same shapes and the same
 * "latest row wins" rule as the JSONL store in store.ts, which the offline
 * scripts keep using; gold:push and gold:pull move data between the two.
 */

type LabelRow = typeof goldAnnotations.$inferSelect;

function toAnnotation(r: Omit<LabelRow, "id" | "userId">): Annotation {
  return {
    item_id: r.itemId,
    annotator: r.annotator,
    evaluation: r.evaluation,
    diagnosis_code: r.diagnosisCode,
    confidence: r.confidence as Annotation["confidence"],
    notes: r.notes ?? undefined,
    annotated_at: r.annotatedAt,
  };
}

export async function readItems(): Promise<GoldItem[]> {
  const rows = await getDb().select().from(goldItems).orderBy(asc(goldItems.createdAt), asc(goldItems.id));
  return rows.map((r) => ({
    id: r.id,
    prompt: r.prompt,
    response: r.response,
    source: r.source as ItemSource,
    origin: r.origin ?? undefined,
    created_at: r.createdAt,
  }));
}

export async function itemExists(id: string): Promise<boolean> {
  const rows = await getDb().select({ id: goldItems.id }).from(goldItems).where(eq(goldItems.id, id)).limit(1);
  return rows.length > 0;
}

/** Adds one item; false when its normalized response is already in the set. */
export async function addItem(item: GoldItem): Promise<boolean> {
  const inserted = await getDb()
    .insert(goldItems)
    .values({
      id: item.id,
      prompt: item.prompt,
      response: item.response,
      responseKey: normalizeResponse(item.response),
      source: item.source,
      origin: item.origin ?? null,
      createdAt: item.created_at,
    })
    .onConflictDoNothing()
    .returning({ id: goldItems.id });
  return inserted.length > 0;
}

export async function listAnnotators(): Promise<string[]> {
  const rows = await getDb()
    .selectDistinct({ annotator: goldAnnotations.annotator })
    .from(goldAnnotations)
    .orderBy(asc(goldAnnotations.annotator));
  return rows.map((r) => r.annotator);
}

/** Latest annotation per item for one annotator. */
export async function readAnnotations(annotator: string): Promise<Map<string, Annotation>> {
  const rows = await getDb()
    .select()
    .from(goldAnnotations)
    .where(eq(goldAnnotations.annotator, annotator))
    .orderBy(asc(goldAnnotations.id));
  return new Map(rows.map((r) => [r.itemId, toAnnotation(r)]));
}

export async function appendAnnotation(a: Annotation, userId: string): Promise<void> {
  await getDb().insert(goldAnnotations).values({
    itemId: a.item_id,
    annotator: a.annotator,
    evaluation: a.evaluation,
    diagnosisCode: a.diagnosis_code,
    confidence: a.confidence,
    notes: a.notes ?? null,
    annotatedAt: a.annotated_at,
    userId,
  });
}

/** Latest decision per item. */
export async function readAdjudications(): Promise<Map<string, AdjudicationRecord>> {
  const rows = await getDb().select().from(goldAdjudications).orderBy(asc(goldAdjudications.id));
  return new Map(
    rows.map((r) => [
      r.itemId,
      {
        ...toAnnotation(r),
        contested: r.contested || undefined,
        rule: r.rule ?? undefined,
        chose: r.chose ?? undefined,
      },
    ]),
  );
}

export async function appendAdjudication(a: AdjudicationRecord, userId: string): Promise<void> {
  await getDb().insert(goldAdjudications).values({
    itemId: a.item_id,
    annotator: a.annotator,
    evaluation: a.evaluation,
    diagnosisCode: a.diagnosis_code,
    confidence: a.confidence,
    notes: a.notes ?? null,
    annotatedAt: a.annotated_at,
    contested: a.contested ?? false,
    rule: a.rule ?? null,
    chose: a.chose ?? null,
    userId,
  });
}

/** A model label set pushed with gold:push; throws when it isn't there. */
export async function readModelLabels(name: string): Promise<Map<string, Annotation>> {
  const rows = await getDb().select().from(goldModelLabels).where(eq(goldModelLabels.setName, name));
  if (!rows.length) throw new Error(`No model labels named "${name}" in D1 (run npm run gold:push)`);
  return new Map(rows.map((r) => [r.itemId, { ...toAnnotation(r), rationale: r.rationale ?? undefined }]));
}

export function readRules(): Rule[] {
  return rules as Rule[];
}
