ALTER TABLE IF EXISTS "hubspot_field_mapping" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE IF EXISTS "hubspot_lead_mapping" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE IF EXISTS "hubspot_token" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE IF EXISTS "hubspot_field_mapping" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "hubspot_lead_mapping" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "hubspot_token" CASCADE;--> statement-breakpoint
-- Convert service column to text first, then delete hubspot events, then recreate enum
ALTER TABLE "public"."webhook_event" ALTER COLUMN "service" SET DATA TYPE text;--> statement-breakpoint
DELETE FROM "public"."webhook_event" WHERE "service" = 'hubspot';--> statement-breakpoint
DROP TYPE IF EXISTS "public"."webhook_service";--> statement-breakpoint
CREATE TYPE "public"."webhook_service" AS ENUM('clerk', 'stripe');--> statement-breakpoint
ALTER TABLE "public"."webhook_event" ALTER COLUMN "service" SET DATA TYPE "public"."webhook_service" USING "service"::"public"."webhook_service";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."internal_field";

-- Add last_interaction_at column to user_place table (nullable - only set on real interactions)
ALTER TABLE "user_place" ADD COLUMN "last_interaction_at" timestamp;

-- Backfill only for places that have real interactions (notes, status, contacts, list assignments, or enrichment)
UPDATE user_place up
SET last_interaction_at = GREATEST(
  COALESCE(up.enriched_at, '1970-01-01'::timestamp),
  COALESCE((SELECT MAX(updated_at) FROM note WHERE user_place_id = up.id), '1970-01-01'::timestamp),
  COALESCE((SELECT MAX(updated_at) FROM status WHERE user_place_id = up.id), '1970-01-01'::timestamp),
  COALESCE((SELECT MAX(updated_at) FROM contact WHERE user_place_id = up.id), '1970-01-01'::timestamp),
  COALESCE((SELECT MAX(created_at) FROM list_place WHERE user_place_id = up.id), '1970-01-01'::timestamp)
)
WHERE
  up.enriched_at IS NOT NULL
  OR EXISTS (SELECT 1 FROM note WHERE user_place_id = up.id)
  OR EXISTS (SELECT 1 FROM status WHERE user_place_id = up.id)
  OR EXISTS (SELECT 1 FROM contact WHERE user_place_id = up.id)
  OR EXISTS (SELECT 1 FROM list_place WHERE user_place_id = up.id);

-- Add index for sorting performance
CREATE INDEX "idx_user_place_last_interaction" ON "user_place" ("last_interaction_at");
