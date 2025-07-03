CREATE TYPE "public"."social_platform" AS ENUM('linkedin', 'twitter', 'facebook', 'instagram', 'youtube', 'tiktok', 'pinterest', 'reddit', 'snapchat');--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contact_social_primary";--> statement-breakpoint
ALTER TABLE "contact_social" ALTER COLUMN "platform" SET DATA TYPE social_platform USING platform::social_platform;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_contact_social_primary" ON "contact_social" USING btree ("contact_id","platform") WHERE "contact_social"."is_primary" = true;--> statement-breakpoint
ALTER TABLE "contact_email" DROP COLUMN IF EXISTS "source";--> statement-breakpoint
ALTER TABLE "contact_social" DROP COLUMN IF EXISTS "source";