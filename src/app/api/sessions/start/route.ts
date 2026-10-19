import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { learningSessions, user } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || "usr_b1_learner_default";

    // Ensure user exists
    const existing = await db.select().from(user).where(eq(user.id, userId));
    if (existing.length === 0) {
      await db.insert(user).values({
        id: userId,
        name: "Alex Rivera",
        email: "alex.learner@glotty.ai",
        emailVerified: true,
      });
    }

    // Count existing sessions for user
    const priorSessions = await db
      .select({ count: sql<number>`count(*)` })
      .from(learningSessions)
      .where(eq(learningSessions.userId, userId));
    const sessionNumber = Number(priorSessions[0]?.count || 0) + 1;

    let goal: string;
    let initialPrompt: string;

    if (sessionNumber === 1) {
      goal = "Cold-start spontaneous conversational narrative baseline (§12, §43)";
      initialPrompt =
        "¡Hola! Bienvenido a Glotty. Aquí no hacemos pruebas aburridas ni te interrumpimos cada vez que escribes. Cuéntame sobre algo interesante o curioso que te haya ocurrido recientemente: un viaje, una anécdota en el trabajo o algo que hiciste el fin de semana pasado.";
    } else {
      goal = "Targeted contrast and spontaneous production follow-up";
      initialPrompt =
        "¡Hola de nuevo! En la sesión anterior estuvimos observando tu uso de los tiempos en el pasado y preposiciones. Para empezar hoy, ¿puedes contarme cómo fue tu último viaje o una salida con amigos?";
    }

    const [newSession] = await db
      .insert(learningSessions)
      .values({
        userId,
        sessionNumber,
        status: "active",
        goal,
      })
      .returning();

    return NextResponse.json({
      success: true,
      sessionId: newSession.id,
      sessionNumber,
      goal,
      initialPrompt,
    });
  } catch (error: any) {
    console.error("Error starting session:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
