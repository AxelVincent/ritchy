CREATE TYPE "public"."search_model" AS ENUM('DEFAULT', 'NAVIGATOR', 'EXPLORER', 'PRO');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "search" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"latitude" text NOT NULL,
	"longitude" text NOT NULL,
	"radius_in_meters" text NOT NULL,
	"place_name" text NOT NULL,
	"keyword" text NOT NULL,
	"model" "search_model" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
