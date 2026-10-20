import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAnnotator } from "@/lib/gold/guard";
import { appendAnnotation, itemExists } from "@/lib/gold/d1";
import { taxonomyCodes } from "@/lib/taxonomy";

const Body = z.object({
  annotator: z.string().regex(/^[a-z0-9_-]{1,40}$/),
  item_id: z.string(),
  evaluation: z.enum(["correct", "incorrect", "uncertain", "not_applicable"]),
  diagnosis_code: z.string().nullable(),
  confidence: z.union([z.literal(1), z.literal(2), z.literal(3)]),
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
  if (a.evaluation === "incorrect" && (!a.diagnosis_code || !taxonomyCodes().has(a.diagnosis_code))) {
    return NextResponse.json({ error: "An incorrect label needs a taxonomy code (or UNKNOWN)" }, { status: 400 });
  }

  const annotation = {
    ...a,
    diagnosis_code: a.evaluation === "incorrect" ? a.diagnosis_code : null,
    notes: a.notes?.trim() || undefined,
    annotated_at: new Date().toISOString(),
  };
  await appendAnnotation(annotation, who.userId);
  return NextResponse.json({ annotation });
}
