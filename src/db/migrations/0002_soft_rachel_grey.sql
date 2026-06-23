ALTER TABLE `note_types` ADD `kind` text DEFAULT 'basic' NOT NULL;--> statement-breakpoint
ALTER TABLE `cards` ADD `template_index` integer DEFAULT 0 NOT NULL;