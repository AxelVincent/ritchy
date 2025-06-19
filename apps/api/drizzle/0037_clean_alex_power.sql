ALTER TABLE "version_history" RENAME COLUMN "record_data" TO "current_state";--> statement-breakpoint
ALTER TABLE "version_history" ADD COLUMN "previous_state" jsonb;