ALTER TABLE "user_place" ADD COLUMN "enriched_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_place" DROP COLUMN IF EXISTS "is_enriched";