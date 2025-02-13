CREATE TYPE "public"."webhook_service" AS ENUM('clerk', 'stripe');--> statement-breakpoint
ALTER TABLE "webhook_event" ADD COLUMN "service" "webhook_service" NOT NULL;