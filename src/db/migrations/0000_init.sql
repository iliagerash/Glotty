CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`password` text,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `concept_edges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`target` text NOT NULL,
	`edge_type` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`source`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `concept_edges_source_idx` ON `concept_edges` (`source`);--> statement-breakpoint
CREATE INDEX `concept_edges_target_idx` ON `concept_edges` (`target`);--> statement-breakpoint
CREATE TABLE `concepts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`domain` text NOT NULL,
	`cefr_level` text,
	`description` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`schema_version` integer DEFAULT 1 NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`occurred_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`language` text NOT NULL,
	`l1_languages` text NOT NULL,
	`concept_ids` text NOT NULL,
	`activity_type` text NOT NULL,
	`item_id` text,
	`prompt_text` text,
	`raw_response` text,
	`response_modality` text DEFAULT 'text' NOT NULL,
	`latency_ms` integer,
	`evaluation` text NOT NULL,
	`eval_confidence` real,
	`diagnosis_code` text,
	`diagnosis_confidence` real,
	`evaluator_version` text NOT NULL,
	`eval_path` text NOT NULL,
	`generator_version` text,
	`item_answer_key` text,
	`policy_action` text NOT NULL,
	`policy_candidates` text NOT NULL,
	`propensity` real NOT NULL,
	`is_exploration` integer NOT NULL,
	`exploration_type` text,
	`cohort` text DEFAULT 'adaptive' NOT NULL,
	`exposure_context` text NOT NULL,
	`evidence_weight` real NOT NULL,
	CONSTRAINT "events_activity_type_check" CHECK(activity_type IN ('cloze', 'forced_choice', 'transformation', 'constrained_production', 'free_production', 'conversation_turn', 'reading', 'listening', 'explanation_view', 'diagnostic_item')),
	CONSTRAINT "events_evaluation_check" CHECK(evaluation IN ('correct', 'incorrect', 'uncertain', 'unscored')),
	CONSTRAINT "events_exposure_context_check" CHECK(exposure_context IN ('drill', 'conversation', 'reading', 'review', 'diagnostic'))
);
--> statement-breakpoint
CREATE INDEX `events_user_occurred_idx` ON `events` (`user_id`,"occurred_at" desc);--> statement-breakpoint
CREATE INDEX `events_evaluator_version_idx` ON `events` (`evaluator_version`);--> statement-breakpoint
CREATE INDEX `events_exploration_idx` ON `events` (`occurred_at`) WHERE is_exploration = 1;--> statement-breakpoint
CREATE TABLE `insight_feedbacks` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`user_id` text NOT NULL,
	`diagnosis_code` text NOT NULL,
	`rating` text NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `learning_sessions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `learner_state_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`snapshot_date` text NOT NULL,
	`language` text DEFAULT 'es' NOT NULL,
	`states` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `learner_snapshots_user_date_idx` ON `learner_state_snapshots` (`user_id`,"snapshot_date" desc);--> statement-breakpoint
CREATE TABLE `learning_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_number` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`goal` text,
	`started_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`ended_at` integer,
	`summary` text,
	`surfaced_insights` text
);
--> statement-breakpoint
CREATE INDEX `learning_sessions_user_idx` ON `learning_sessions` (`user_id`,"started_at" desc);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` integer NOT NULL,
	`token` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `taxonomy_codes` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`domain` text NOT NULL,
	`definition` text NOT NULL,
	`positive_examples` text NOT NULL,
	`negative_examples` text NOT NULL,
	`distinguishing_probe` text NOT NULL,
	`intervention_family` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
