-- Add search_model column with a valid default from current enum
ALTER TABLE "subscription" ADD COLUMN "search_model" "search_model" DEFAULT 'ESSENTIALS' NOT NULL;--> statement-breakpoint

-- Convert columns to text for data manipulation
ALTER TABLE "public"."search" ALTER COLUMN "model" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "public"."subscription" ALTER COLUMN "search_model" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "public"."subscription" ALTER COLUMN "plan" SET DATA TYPE text;--> statement-breakpoint

-- Remove default constraints before dropping enum types
ALTER TABLE "public"."subscription" ALTER COLUMN "search_model" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "public"."subscription" ALTER COLUMN "plan" DROP DEFAULT;--> statement-breakpoint

-- Drop old enum types
DROP TYPE "public"."search_model";--> statement-breakpoint
DROP TYPE "public"."subscription_plan";--> statement-breakpoint

-- Create new enum types
CREATE TYPE "public"."search_model" AS ENUM('BASIC', 'ENHANCED', 'ADVANCED', 'EXPERT');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('FREE', 'ESSENTIALS', 'PRO');--> statement-breakpoint

-- Data cleaning for subscription table
UPDATE "public"."subscription" 
SET "plan" = 'ESSENTIALS', "search_model" = 'ENHANCED' 
WHERE "plan" IN ('NAVIGATOR', 'EXPLORER', 'PRO');--> statement-breakpoint

UPDATE "public"."subscription" 
SET "search_model" = 'BASIC' 
WHERE "plan" = 'FREE';--> statement-breakpoint

UPDATE "public"."subscription" 
SET "search_model" = 'ENHANCED' 
WHERE "plan" = 'ESSENTIALS' AND "search_model" = 'ESSENTIALS';--> statement-breakpoint

-- Data cleaning for search table
UPDATE "public"."search" 
SET "model" = 'ENHANCED' 
WHERE "model" IN ('ESSENTIALS', 'NAVIGATOR', 'EXPLORER', 'PRO');--> statement-breakpoint

UPDATE "public"."search" 
SET "model" = 'BASIC' 
WHERE "model" NOT IN ('BASIC', 'ENHANCED', 'ADVANCED', 'EXPERT');--> statement-breakpoint

-- Convert columns back to enum types and restore defaults
ALTER TABLE "public"."search" ALTER COLUMN "model" SET DATA TYPE "public"."search_model" USING "model"::"public"."search_model";--> statement-breakpoint
ALTER TABLE "public"."subscription" ALTER COLUMN "search_model" SET DATA TYPE "public"."search_model" USING "search_model"::"public"."search_model";--> statement-breakpoint
ALTER TABLE "public"."subscription" ALTER COLUMN "search_model" SET DEFAULT 'BASIC';--> statement-breakpoint
ALTER TABLE "public"."subscription" ALTER COLUMN "plan" SET DATA TYPE "public"."subscription_plan" USING "plan"::"public"."subscription_plan";--> statement-breakpoint
ALTER TABLE "public"."subscription" ALTER COLUMN "plan" SET DEFAULT 'FREE';