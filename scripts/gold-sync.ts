/**
 * Moves the gold set between data/gold (what the offline scripts read) and
 * D1 (what /annotate and /adjudicate read and write).
 *
 *   npm run gold:push [-- --remote]   items and model label sets -> D1
 *   npm run gold:pull [-- --remote]   human labels, adjudications, added items -> data/gold
 *
 * Push adds new items (existing ones are left as they are) and replaces each
 * combined model label set; per-run files (<set>.r1, .r2) stay local. Pull
 * rewrites annotations/<annotator>.jsonl and adjudications.jsonl from D1, so
 * D1 is the source for human labels, and appends items added in the app to
 * items.jsonl. Commit what pull writes.
 */
import { executeStatements, insertSql, isRemote, query, sqlValue } from "@/db/wrangler";
import {
  addItems,
  annotatorFile,
  listModelLabelSets,
  normalizeResponse,
  readItems,
  readModelLabels,
  writeAdjudications,
  writeAnnotations,
  type AdjudicationRecord,
  type Annotation,
  type GoldItem,
  type ItemSource,
} from "@/lib/gold/store";

const RUN_FILE = /\.r\d+$/;

function push(remote: boolean) {
  const items = readItems();
  const statements = items.map((i) =>
    insertSql(
      "gold_items",
      {
        id: i.id,
        prompt: i.prompt,
        response: i.response,
        response_key: normalizeResponse(i.response),
        source: i.source,
        origin: i.origin ?? null,
        created_at: i.created_at,
      },
      "ON CONFLICT DO NOTHING",
    ),
  );

  const sets = listModelLabelSets().filter((name) => !RUN_FILE.test(name));
  for (const name of sets) {
    statements.push(`DELETE FROM "gold_model_labels" WHERE "set_name" = ${sqlValue(name)};`);
    for (const l of readModelLabels(name).values()) {
      statements.push(
        insertSql("gold_model_labels", {
          set_name: name,
          item_id: l.item_id,
          annotator: l.annotator,
          evaluation: l.evaluation,
          diagnosis_code: l.diagnosis_code,
          confidence: l.confidence,
          notes: l.notes ?? null,
          rationale: l.rationale ?? null,
          annotated_at: l.annotated_at,
        }),
      );
    }
  }

  executeStatements("gold-push", statements, remote);
  console.log(`Pushed ${items.length} items and ${sets.length} model label sets (${sets.join(", ")}) to ${remote ? "remote" : "local"} D1.`);
}

interface LabelRow {
  item_id: string;
  annotator: string;
  evaluation: Annotation["evaluation"];
  diagnosis_code: string | null;
  confidence: Annotation["confidence"];
  notes: string | null;
  annotated_at: string;
}

const toAnnotation = (r: LabelRow): Annotation => ({
  item_id: r.item_id,
  annotator: r.annotator,
  evaluation: r.evaluation,
  diagnosis_code: r.diagnosis_code,
  confidence: r.confidence,
  ...(r.notes ? { notes: r.notes } : {}),
  annotated_at: r.annotated_at,
});

function pull(remote: boolean) {
  const annotations = query<LabelRow>(`SELECT * FROM gold_annotations ORDER BY id`, remote);
  const byAnnotator = new Map<string, Annotation[]>();
  for (const r of annotations) {
    annotatorFile(r.annotator); // rejects a name that isn't a safe file name
    byAnnotator.set(r.annotator, [...(byAnnotator.get(r.annotator) ?? []), toAnnotation(r)]);
  }
  for (const [annotator, rows] of byAnnotator) writeAnnotations(annotator, rows);

  const adjudications = query<LabelRow & { contested: number; rule: string | null; chose: string | null }>(
    `SELECT * FROM gold_adjudications ORDER BY id`,
    remote,
  );
  if (adjudications.length) {
    writeAdjudications(
      adjudications.map(
        (r): AdjudicationRecord => ({
          ...toAnnotation(r),
          ...(r.contested ? { contested: true } : {}),
          ...(r.rule ? { rule: r.rule } : {}),
          ...(r.chose ? { chose: r.chose } : {}),
        }),
      ),
    );
  }

  const added = query<{ id: string; prompt: string; response: string; source: ItemSource; origin: string | null; created_at: string }>(
    `SELECT * FROM gold_items WHERE source IN ('learner', 'hand_written') ORDER BY created_at, id`,
    remote,
  );
  const fresh = addItems(
    added.map(
      (r): GoldItem => ({
        id: r.id,
        prompt: r.prompt,
        response: r.response,
        source: r.source,
        ...(r.origin ? { origin: r.origin } : {}),
        created_at: r.created_at,
      }),
    ),
  );

  console.log(
    `Pulled from ${remote ? "remote" : "local"} D1: ${annotations.length} annotations from ${byAnnotator.size} annotator(s), ` +
      `${adjudications.length} adjudications, ${fresh.length} new items.`,
  );
}

const command = process.argv[2];
if (command === "push") push(isRemote());
else if (command === "pull") pull(isRemote());
else {
  console.error("Usage: tsx scripts/gold-sync.ts push|pull [--remote]");
  process.exit(1);
}
