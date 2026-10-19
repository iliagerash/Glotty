import { db } from "@/db";
import { events } from "@/db/schema";
import { eq, and, lte, asc } from "drizzle-orm";
import {
  LearnerProfile,
  createInitialConceptState,
  updateConceptState,
} from "./state";

/**
 * Reconstructs a learner's exact multidimensional probabilistic state
 * at any point in time purely from immutable events (§35).
 */
export async function reconstructLearnerState(
  userId: string,
  targetDate?: Date
): Promise<LearnerProfile> {
  const conditions = [eq(events.userId, userId)];
  if (targetDate) {
    conditions.push(lte(events.occurredAt, targetDate));
  }

  const rawEvents = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(asc(events.occurredAt));

  const profile: LearnerProfile = {
    userId,
    language: "es",
    concepts: {},
    updatedAt: targetDate || new Date(),
  };

  for (const ev of rawEvents) {
    for (const conceptId of ev.conceptIds) {
      if (!profile.concepts[conceptId]) {
        profile.concepts[conceptId] = createInitialConceptState(conceptId);
      }

      updateConceptState(
        profile.concepts[conceptId],
        ev.evaluation as any,
        ev.activityType,
        ev.exposureContext,
        ev.evalConfidence ?? 0,
        ev.diagnosisCode || null,
        ev.occurredAt
      );
    }
  }

  return profile;
}
