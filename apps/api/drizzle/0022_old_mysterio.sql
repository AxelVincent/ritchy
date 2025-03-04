ALTER TABLE "public"."status" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."lead_status";--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('NEW', 'NO_ANSWER', 'CONTACTED', 'FOLLOW_UP', 'MEETING', 'IN_PROGRESS', 'WON', 'LOST');--> statement-breakpoint
ALTER TABLE "public"."status" ALTER COLUMN "status" SET DATA TYPE "public"."lead_status" USING "status"::"public"."lead_status";