CREATE TYPE "public"."activity_kind" AS ENUM('cloze', 'forced_choice', 'transformation', 'constrained_production', 'free_production', 'conversation_turn', 'reading', 'listening', 'explanation_view', 'diagnostic_item');--> statement-breakpoint
CREATE TYPE "public"."evaluation_result" AS ENUM('correct', 'incorrect', 'uncertain', 'unscored');--> statement-breakpoint
CREATE TYPE "public"."exposure_kind" AS ENUM('drill', 'conversation', 'reading', 'review', 'diagnostic');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp with time zone,
	"refreshTokenExpiresAt" timestamp with time zone,
	"scope" text,
	"password" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concept_edges" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"target" text NOT NULL,
	"edge_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concepts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"cefr_level" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schema_version" smallint DEFAULT 1 NOT NULL,
	"user_id" text NOT NULL,
	"session_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"language" text NOT NULL,
	"l1_languages" text[] NOT NULL,
	"concept_ids" text[] NOT NULL,
	"activity_type" "activity_kind" NOT NULL,
	"item_id" uuid,
	"prompt_text" text,
	"raw_response" text,
	"response_modality" text DEFAULT 'text' NOT NULL,
	"latency_ms" integer,
	"evaluation" "evaluation_result" NOT NULL,
	"eval_confidence" real,
	"diagnosis_code" text,
	"diagnosis_confidence" real,
	"evaluator_version" text NOT NULL,
	"eval_path" text NOT NULL,
	"generator_version" text,
	"item_answer_key" jsonb,
	"policy_action" text NOT NULL,
	"policy_candidates" jsonb NOT NULL,
	"propensity" real NOT NULL,
	"is_exploration" boolean NOT NULL,
	"exploration_type" text,
	"cohort" text DEFAULT 'adaptive' NOT NULL,
	"exposure_context" "exposure_kind" NOT NULL,
	"evidence_weight" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insight_feedbacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"user_id" text NOT NULL,
	"diagnosis_code" text NOT NULL,
	"rating" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learner_state_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"snapshot_date" date NOT NULL,
	"language" text DEFAULT 'es' NOT NULL,
	"states" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"session_number" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"goal" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"summary" jsonb,
	"surfaced_insights" jsonb
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "taxonomy_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"definition" text NOT NULL,
	"positive_examples" jsonb NOT NULL,
	"negative_examples" jsonb NOT NULL,
	"distinguishing_probe" text NOT NULL,
	"intervention_family" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_edges" ADD CONSTRAINT "concept_edges_source_concepts_id_fk" FOREIGN KEY ("source") REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_edges" ADD CONSTRAINT "concept_edges_target_concepts_id_fk" FOREIGN KEY ("target") REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insight_feedbacks" ADD CONSTRAINT "insight_feedbacks_session_id_learning_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."learning_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "concept_edges_source_idx" ON "concept_edges" USING btree ("source");--> statement-breakpoint
CREATE INDEX "concept_edges_target_idx" ON "concept_edges" USING btree ("target");--> statement-breakpoint
CREATE INDEX "events_user_occurred_idx" ON "events" USING btree ("user_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "events_concepts_gin_idx" ON "events" USING gin ("concept_ids");--> statement-breakpoint
CREATE INDEX "events_evaluator_version_idx" ON "events" USING btree ("evaluator_version");--> statement-breakpoint
CREATE INDEX "events_exploration_idx" ON "events" USING btree ("occurred_at") WHERE is_exploration = true;--> statement-breakpoint
CREATE INDEX "learner_snapshots_user_date_idx" ON "learner_state_snapshots" USING btree ("user_id","snapshot_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "learning_sessions_user_idx" ON "learning_sessions" USING btree ("user_id","started_at" DESC NULLS LAST);