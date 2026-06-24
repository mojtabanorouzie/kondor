ALTER TABLE `decks` ADD `deleted_at` integer;
--> statement-breakpoint
ALTER TABLE `notes` ADD `deleted_at` integer;
--> statement-breakpoint
ALTER TABLE `cards` ADD `deleted_at` integer;
