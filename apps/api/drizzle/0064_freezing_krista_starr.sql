CREATE TYPE "public"."price_level" AS ENUM('PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE', 'PRICE_LEVEL_MODERATE', 'PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE');--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "location" jsonb;--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "types" text[];--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "primary_type" text;--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "price_level" "price_level";--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "price_range" jsonb;--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "rating" real;--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "rating_count" integer;--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "utc_offset_minutes" integer;--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "opening_hours" jsonb;--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "address" jsonb;