import { NextRequest, NextResponse } from "next/server";
import { evaluateSync } from "@/lib/evaluator/sync";
import { evaluateAsync } from "@/lib/evaluator/async";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt = "", response = "", conceptId = "es.gram.aspect.pret_imp" } = body;

    if (!response) {
      return NextResponse.json(
        { success: false, error: "Response text is required" },
        { status: 400 }
      );
    }

    // 1. Synchronous Path
    const syncRes = evaluateSync(response, conceptId);

    // 2. Asynchronous Path (model gateway)
    const asyncRes = await evaluateAsync(prompt, response, conceptId);

    return NextResponse.json({
      success: true,
      sync: syncRes,
      async: asyncRes,
    });
  } catch (error: any) {
    console.error("Evaluator test error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
