CREATE TABLE `gold_adjudications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` text NOT NULL,
	`annotator` text NOT NULL,
	`evaluation` text NOT NULL,
	`diagnosis_code` text,
	`confidence` integer NOT NULL,
	`notes` text,
	`annotated_at` text NOT NULL,
	`contested` integer DEFAULT false NOT NULL,
	`rule` text,
	`chose` text,
	`user_id` text
);
--> statement-breakpoint
CREATE INDEX `gold_adjudications_item_idx` ON `gold_adjudications` (`item_id`);--> statement-breakpoint
CREATE TABLE `gold_annotations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` text NOT NULL,
	`annotator` text NOT NULL,
	`evaluation` text NOT NULL,
	`diagnosis_code` text,
	`confidence` integer NOT NULL,
	`notes` text,
	`annotated_at` text NOT NULL,
	`user_id` text
);
--> statement-breakpoint
CREATE INDEX `gold_annotations_annotator_idx` ON `gold_annotations` (`annotator`,`item_id`);--> statement-breakpoint
CREATE TABLE `gold_items` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt` text NOT NULL,
	`response` text NOT NULL,
	`response_key` text NOT NULL,
	`source` text NOT NULL,
	`origin` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gold_items_response_key_unique` ON `gold_items` (`response_key`);--> statement-breakpoint
CREATE TABLE `gold_model_labels` (
	`set_name` text NOT NULL,
	`item_id` text NOT NULL,
	`annotator` text NOT NULL,
	`evaluation` text NOT NULL,
	`diagnosis_code` text,
	`confidence` integer NOT NULL,
	`notes` text,
	`annotated_at` text NOT NULL,
	`rationale` text,
	PRIMARY KEY(`set_name`, `item_id`)
);
