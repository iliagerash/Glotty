import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";

/**
 * Annotation needs a signed-in account whose email is listed in
 * GLOTTY_ANNOTATOR_EMAILS (comma-separated). In development an unset list
 * lets any signed-in account in; in production it lets nobody in.
 */
export async function requireAnnotator(req: Request): Promise<{ userId: string } | NextResponse> {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Sign in to annotate" }, { status: 401 });

  const allowed = (process.env.GLOTTY_ANNOTATOR_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const open = !allowed.length && process.env.NODE_ENV !== "production";
  if (!open && !allowed.includes(session.user.email.toLowerCase())) {
    return NextResponse.json({ error: `${session.user.email} is not an annotator` }, { status: 403 });
  }
  return { userId: session.user.id };
}
