CREATE TYPE "public"."business_status" AS ENUM('OPERATIONAL', 'CLOSED_TEMPORARILY', 'CLOSED_PERMANENTLY');--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "business_status" "business_status";--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "google_maps_links" jsonb;--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "editorial_summary" text;