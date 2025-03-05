ALTER TYPE "public"."subscription_plan" ADD VALUE 'ESSENTIALS' BEFORE 'EXPLORER';--> statement-breakpoint
ALTER TABLE "public"."search" ALTER COLUMN "model" SET DATA TYPE text;--> statement-breakpoint
UPDATE "public"."search" SET "model" = 'ESSENTIALS' WHERE "model" = 'DEFAULT';--> statement-breakpoint
DROP TYPE "public"."search_model";--> statement-breakpoint
CREATE TYPE "public"."search_model" AS ENUM('ESSENTIALS', 'NAVIGATOR', 'EXPLORER', 'PRO');--> statement-breakpoint
ALTER TABLE "public"."search" ALTER COLUMN "model" SET DATA TYPE "public"."search_model" USING "model"::"public"."search_model";