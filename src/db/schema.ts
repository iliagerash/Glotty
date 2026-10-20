import { sqliteTable, text, integer, real, index, check } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// SQLite (Cloudflare D1). Timestamps are integer milliseconds, booleans are
// 0/1, JSON and arrays are JSON text, ids are random UUID strings.
const createdAt = (name: string) =>
  integer(name, { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch('subsec') * 1000)`);
const uuid = (name: string) => text(name).$defaultFn(() => crypto.randomUUID());
const json = <T = unknown>(name: string) => text(name, { mode: "json" }).$type<T>();

// ==========================================
// 1. Better Auth Tables
// ==========================================

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: createdAt("createdAt"),
  updatedAt: createdAt("updatedAt"),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: createdAt("createdAt"),
  updatedAt: createdAt("updatedAt"),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp_ms" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdAt("createdAt"),
  updatedAt: createdAt("updatedAt"),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
  createdAt: createdAt("createdAt"),
  updatedAt: createdAt("updatedAt"),
});

// ==========================================
// 2. Appendix A — Event Schema Enums & Table
// ==========================================

// Enums are text columns with a CHECK constraint (SQLite has no enum type).
export const evaluationResults = ["correct", "incorrect", "uncertain", "unscored"] as const;

export const activityKinds = [
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
] as const;

export const exposureKinds = ["drill", "conversation", "reading", "review", "diagnostic"] as const;

const inList = (column: string, values: readonly string[]) =>
  sql.raw(`${column} IN (${values.map((v) => `'${v}'`).join(", ")})`);

export const events = sqliteTable(
  "events",
  {
    eventId: uuid("event_id").primaryKey(),
    schemaVersion: integer("schema_version").notNull().default(1),
    userId: text("user_id").notNull(),
    sessionId: text("session_id").notNull(),
    occurredAt: createdAt("occurred_at"),

    // Linguistic context
    language: text("language").notNull(), // BCP-47, e.g. 'es'
    l1Languages: json<string[]>("l1_languages").notNull(), // Learner repertoire
    conceptIds: json<string[]>("concept_ids").notNull(), // e.g. ['es.gram.aspect.pret_imp']

    // The interaction
    activityType: text("activity_type", { enum: activityKinds }).notNull(),
    itemId: text("item_id"),
    promptText: text("prompt_text"),
    rawResponse: text("raw_response"), // NEVER discarded
    responseModality: text("response_modality").notNull().default("text"), // text | speech | choice
    latencyMs: integer("latency_ms"),

    // Evaluation (derived, re-computable)
    evaluation: text("evaluation", { enum: evaluationResults }).notNull(),
    evalConfidence: real("eval_confidence"),
    diagnosisCode: text("diagnosis_code"), // taxonomy code or 'UNKNOWN'
    diagnosisConfidence: real("diagnosis_confidence"),
    evaluatorVersion: text("evaluator_version").notNull(),
    evalPath: text("eval_path").notNull(), // sync | async

    // Provenance
    generatorVersion: text("generator_version"),
    itemAnswerKey: json("item_answer_key"), // stored at generation time

    // Policy and causal identification
    policyAction: text("policy_action").notNull(),
    policyCandidates: json<Array<{ action: string; est_value: number }>>("policy_candidates").notNull(), // [{action, est_value}]
    propensity: real("propensity").notNull(), // P(chosen | state)
    isExploration: integer("is_exploration", { mode: "boolean" }).notNull(),
    explorationType: text("exploration_type"), // near_tie | style | jitter | control
    cohort: text("cohort").notNull().default("adaptive"), // adaptive | control

    // Weighting
    exposureContext: text("exposure_context", { enum: exposureKinds }).notNull(),
    evidenceWeight: real("evidence_weight").notNull(), // see §16
  },
  (table) => [
    index("events_user_occurred_idx").on(table.userId, sql`${table.occurredAt} desc`),
    index("events_evaluator_version_idx").on(table.evaluatorVersion),
    index("events_exploration_idx").on(table.occurredAt).where(sql`is_exploration = 1`),
    check("events_activity_type_check", inList("activity_type", activityKinds)),
    check("events_evaluation_check", inList("evaluation", evaluationResults)),
    check("events_exposure_context_check", inList("exposure_context", exposureKinds)),
  ]
);

// ==========================================
// 3. Knowledge Graph Tables (§18, Appendix C)
// ==========================================

export const concepts = sqliteTable("concepts", {
  id: text("id").primaryKey(), // e.g. es.gram.aspect.pret_imp
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  cefrLevel: text("cefr_level"),
  description: text("description"),
  createdAt: createdAt("created_at"),
});

export const conceptEdges = sqliteTable(
  "concept_edges",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    source: text("source")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    target: text("target")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    edgeType: text("edge_type").notNull(), // prerequisite | contrasts_with | instance_of | interferes_with
    createdAt: createdAt("created_at"),
  },
  (table) => [
    index("concept_edges_source_idx").on(table.source),
    index("concept_edges_target_idx").on(table.target),
  ]
);

// ==========================================
// 4. Diagnostic Taxonomy Table (Appendix B)
// ==========================================

export const taxonomyCodes = sqliteTable("taxonomy_codes", {
  code: text("code").primaryKey(), // e.g. PI.01, PP.01, UNKNOWN
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  definition: text("definition").notNull(),
  positiveExamples: json("positive_examples").notNull(),
  negativeExamples: json("negative_examples").notNull(),
  distinguishingProbe: text("distinguishing_probe").notNull(),
  interventionFamily: text("intervention_family").notNull(),
  createdAt: createdAt("created_at"),
});

// ==========================================
// 5. Learning Sessions & Feedback (§41, §11)
// ==========================================

export const learningSessions = sqliteTable(
  "learning_sessions",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id").notNull(),
    sessionNumber: integer("session_number").notNull().default(1),
    status: text("status").notNull().default("active"), // active | completed
    goal: text("goal"),
    startedAt: createdAt("started_at"),
    endedAt: integer("ended_at", { mode: "timestamp_ms" }),
    summary: json("summary"),
    surfacedInsights: json<Array<{
      id: string;
      code: string;
      hedged: boolean;
      text: string;
      confidence: number;
    }>>("surfaced_insights"),
  },
  (table) => [
    index("learning_sessions_user_idx").on(table.userId, sql`${table.startedAt} desc`),
  ]
);

export const insightFeedbacks = sqliteTable("insight_feedbacks", {
  id: uuid("id").primaryKey(),
  sessionId: text("session_id").references(() => learningSessions.id, {
    onDelete: "set null",
  }),
  userId: text("user_id").notNull(),
  diagnosisCode: text("diagnosis_code").notNull(),
  rating: text("rating").notNull(), // 'useful' | 'not_useful' | 'wrong'
  notes: text("notes"),
  createdAt: createdAt("created_at"),
});

// ==========================================
// 6. Materialized Learner State Snapshots (§35)
// ==========================================

export const learnerStateSnapshots = sqliteTable(
  "learner_state_snapshots",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id").notNull(),
    snapshotDate: text("snapshot_date").notNull(), // YYYY-MM-DD
    language: text("language").notNull().default("es"),
    states: json("states").notNull(), // concept_id -> { estimate, uncertainty, obsCount, levels: {...} }
    createdAt: createdAt("created_at"),
  },
  (table) => [
    index("learner_snapshots_user_date_idx").on(table.userId, sql`${table.snapshotDate} desc`),
  ]
);
