import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { annotationDisabled } from "@/lib/gold/guard";
import { addItems, itemIdFor } from "@/lib/gold/store";

/** Adds a real learner response (or a hand-written one) to the candidate pool. */
const Body = z.object({
  prompt: z.string().max(1000),
  response: z.string().min(2).max(2000),
  source: z.enum(["learner", "hand_written"]),
  origin: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const disabled = annotationDisabled();
  if (disabled) return disabled;

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }
  const { prompt, response, source, origin } = parsed.data;
  const prefix = source === "learner" ? "lrn" : "hw";
  const added = addItems([
    {
      id: itemIdFor(prefix, response),
      prompt: prompt.trim(),
      response: response.trim(),
      source,
      origin: origin?.trim() || undefined,
      created_at: new Date().toISOString(),
    },
  ]);
  if (!added.length) return NextResponse.json({ error: "That response is already in the set" }, { status: 409 });
  return NextResponse.json({ item: added[0] });
}
