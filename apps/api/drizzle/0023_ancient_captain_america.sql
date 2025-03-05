ALTER TABLE "public"."status" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."lead_status";--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('NEW', 'NO_ANSWER', 'CONTACTED', 'FOLLOW_UP', 'MEETING', 'INTERESTED', 'WON', 'LOST');--> statement-breakpoint

-- Update all records with status 'IN_PROGRESS' to 'INTERESTED' BEFORE casting to enum
UPDATE "public"."status" 
SET "status" = 'INTERESTED'
WHERE "status" = 'IN_PROGRESS';--> statement-breakpoint

-- Now cast to enum type after the data has been updated
ALTER TABLE "public"."status" ALTER COLUMN "status" SET DATA TYPE "public"."lead_status" USING "status"::"public"."lead_status"; 