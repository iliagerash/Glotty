import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  smallint,
  real,
  jsonb,
  uuid,
  serial,
  date,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ==========================================
// 1. Better Auth Tables
// ==========================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================
// 2. Appendix A — Event Schema Enums & Table
// ==========================================

export const evaluationResultEnum = pgEnum("evaluation_result", [
  "correct",
  "incorrect",
  "uncertain",
  "unscored",
]);

export const activityKindEnum = pgEnum("activity_kind", [
  "cloze",
  "forced_choice",
  "transformation",
  "constrained_production",
  "free_production",
  "conversation_turn",
  "reading",
  "listening",
  "explanation_view",
  "diagnostic_item",
]);

export const exposureKindEnum = pgEnum("exposure_kind", [
  "drill",
  "conversation",
  "reading",
  "review",
  "diagnostic",
]);

export const events = pgTable(
  "events",
  {
    eventId: uuid("event_id").defaultRandom().primaryKey(),
    schemaVersion: smallint("schema_version").notNull().default(1),
    userId: text("user_id").notNull(),
    sessionId: uuid("session_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),

    // Linguistic context
    language: text("language").notNull(), // BCP-47, e.g. 'es'
    l1Languages: text("l1_languages").array().notNull(), // Learner repertoire
    conceptIds: text("concept_ids").array().notNull(), // e.g. ['es.gram.aspect.pret_imp']

    // The interaction
    activityType: activityKindEnum("activity_type").notNull(),
    itemId: uuid("item_id"),
    promptText: text("prompt_text"),
    rawResponse: text("raw_response"), // NEVER discarded
    responseModality: text("response_modality").notNull().default("text"), // text | speech | choice
    latencyMs: integer("latency_ms"),

    // Evaluation (derived, re-computable)
    evaluation: evaluationResultEnum("evaluation").notNull(),
    evalConfidence: real("eval_confidence"),
    diagnosisCode: text("diagnosis_code"), // taxonomy code or 'UNKNOWN'
    diagnosisConfidence: real("diagnosis_confidence"),
    evaluatorVersion: text("evaluator_version").notNull(),
    evalPath: text("eval_path").notNull(), // sync | async

    // Provenance
    generatorVersion: text("generator_version"),
    itemAnswerKey: jsonb("item_answer_key"), // stored at generation time

    // Policy and causal identification
    policyAction: text("policy_action").notNull(),
    policyCandidates: jsonb("policy_candidates").notNull(), // [{action, est_value}]
    propensity: real("propensity").notNull(), // P(chosen | state)
    isExploration: boolean("is_exploration").notNull(),
    explorationType: text("exploration_type"), // near_tie | style | jitter | control
    cohort: text("cohort").notNull().default("adaptive"), // adaptive | control

    // Weighting
    exposureContext: exposureKindEnum("exposure_context").notNull(),
    evidenceWeight: real("evidence_weight").notNull(), // see §16
  },
  (table) => [
    index("events_user_occurred_idx").on(table.userId, table.occurredAt.desc()),
    index("events_concepts_gin_idx").using("gin", table.conceptIds),
    index("events_evaluator_version_idx").on(table.evaluatorVersion),
    index("events_exploration_idx").on(table.occurredAt).where(sql`is_exploration = true`),
  ]
);

// ==========================================
// 3. Knowledge Graph Tables (§18, Appendix C)
// ==========================================

export const concepts = pgTable("concepts", {
  id: text("id").primaryKey(), // e.g. es.gram.aspect.pret_imp
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  cefrLevel: text("cefr_level"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const conceptEdges = pgTable(
  "concept_edges",
  {
    id: serial("id").primaryKey(),
    source: text("source")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    target: text("target")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    edgeType: text("edge_type").notNull(), // prerequisite | contrasts_with | instance_of | interferes_with
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("concept_edges_source_idx").on(table.source),
    index("concept_edges_target_idx").on(table.target),
  ]
);

// ==========================================
// 4. Diagnostic Taxonomy Table (Appendix B)
// ==========================================

export const taxonomyCodes = pgTable("taxonomy_codes", {
  code: text("code").primaryKey(), // e.g. PI.01, PP.01, UNKNOWN
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  definition: text("definition").notNull(),
  positiveExamples: jsonb("positive_examples").notNull(),
  negativeExamples: jsonb("negative_examples").notNull(),
  distinguishingProbe: text("distinguishing_probe").notNull(),
  interventionFamily: text("intervention_family").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================
// 5. Learning Sessions & Feedback (§41, §11)
// ==========================================

export const learningSessions = pgTable(
  "learning_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    sessionNumber: integer("session_number").notNull().default(1),
    status: text("status").notNull().default("active"), // active | completed
    goal: text("goal"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    summary: jsonb("summary"),
    surfacedInsights: jsonb("surfaced_insights").$type<Array<{
      id: string;
      code: string;
      hedged: boolean;
      text: string;
      confidence: number;
    }>>(),
  },
  (table) => [
    index("learning_sessions_user_idx").on(table.userId, table.startedAt.desc()),
  ]
);

export const insightFeedbacks = pgTable("insight_feedbacks", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").references(() => learningSessions.id, {
    onDelete: "set null",
  }),
  userId: text("user_id").notNull(),
  diagnosisCode: text("diagnosis_code").notNull(),
  rating: text("rating").notNull(), // 'useful' | 'not_useful' | 'wrong'
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================
// 6. Materialized Learner State Snapshots (§35)
// ==========================================

export const learnerStateSnapshots = pgTable(
  "learner_state_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    snapshotDate: date("snapshot_date").notNull(),
    language: text("language").notNull().default("es"),
    states: jsonb("states").notNull(), // concept_id -> { estimate, uncertainty, obsCount, levels: {...} }
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("learner_snapshots_user_date_idx").on(table.userId, table.snapshotDate.desc()),
  ]
);
