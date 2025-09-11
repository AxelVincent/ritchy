CREATE TYPE "public"."email_quality" AS ENUM('good', 'risky', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."email_result" AS ENUM('ok', 'unknown');--> statement-breakpoint
ALTER TABLE "enrichment_email" ALTER COLUMN "quality" SET DATA TYPE email_quality USING quality::email_quality;--> statement-breakpoint
ALTER TABLE "enrichment_email" ALTER COLUMN "result" SET DATA TYPE email_result USING result::email_result;--> statement-breakpoint
ALTER TABLE "contact_email" ADD COLUMN "is_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_email" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "contact_email" ADD COLUMN "quality" "email_quality";--> statement-breakpoint
ALTER TABLE "contact_email" ADD COLUMN "result" "email_result";--> statement-breakpoint
ALTER TABLE "contact_email" ADD COLUMN "role" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_email" ADD COLUMN "free" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "contact_email" SET 
  "source" = ee."source",
  "quality" = ee."quality",
  "result" = ee."result",
  "role" = ee."role",
  "free" = ee."free"
FROM "enrichment_email" ee
WHERE "contact_email"."email" = ee."email";--> statement-breakpoint