ALTER TABLE "public"."contact_phone" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "public"."enrichment_phone" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."phone_type";--> statement-breakpoint
CREATE TYPE "public"."phone_type" AS ENUM('PREMIUM_RATE', 'TOLL_FREE', 'SHARED_COST', 'VOIP', 'PERSONAL_NUMBER', 'PAGER', 'UAN', 'VOICEMAIL', 'FIXED_LINE_OR_MOBILE', 'FIXED_LINE', 'MOBILE');--> statement-breakpoint
ALTER TABLE "public"."contact_phone" ALTER COLUMN "type" SET DATA TYPE "public"."phone_type" USING "type"::"public"."phone_type";--> statement-breakpoint
ALTER TABLE "public"."enrichment_phone" ALTER COLUMN "type" SET DATA TYPE "public"."phone_type" USING "type"::"public"."phone_type";