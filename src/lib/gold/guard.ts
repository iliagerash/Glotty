import { NextResponse } from "next/server";

/**
 * The annotation tool writes to files in the repository, so it only runs in
 * development unless explicitly enabled.
 */
export function annotationDisabled(): NextResponse | null {
  if (process.env.NODE_ENV === "production" && process.env.GLOTTY_ENABLE_ANNOTATION !== "1") {
    return NextResponse.json({ error: "Annotation is disabled" }, { status: 404 });
  }
  return null;
}
