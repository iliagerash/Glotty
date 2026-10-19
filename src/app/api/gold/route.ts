import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { annotationDisabled } from "@/lib/gold/guard";
import { annotatorFile, readAnnotations, readItems } from "@/lib/gold/store";
import { loadTaxonomy } from "@/lib/taxonomy";

/**
 * Items to annotate, in an order shuffled per annotator so that generator
 * batches (which are grouped by misconception) don't hint at the answer.
 * The generator's intended labels are never returned.
 */
export async function GET(req: NextRequest) {
  const disabled = annotationDisabled();
  if (disabled) return disabled;

  const annotator = req.nextUrl.searchParams.get("annotator") ?? "";
  try {
    annotatorFile(annotator);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const order = (id: string) => crypto.createHash("sha256").update(annotator + id).digest("hex");
  const items = readItems()
    .map(({ id, prompt, response }) => ({ id, prompt, response }))
    .sort((a, b) => order(a.id).localeCompare(order(b.id)));

  return NextResponse.json({
    items,
    annotations: Object.fromEntries(readAnnotations(annotator)),
    taxonomy: loadTaxonomy().map(({ code, name, domain, definition, negative_examples }) => ({
      code,
      name,
      domain,
      definition,
      negative_examples,
    })),
  });
}
