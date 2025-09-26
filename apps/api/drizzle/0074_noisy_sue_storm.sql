ALTER TYPE "public"."subscription_plan" ADD VALUE 'ENTERPRISE';--> statement-breakpoint
ALTER TABLE "credits" DROP CONSTRAINT "enrichment_credit_check";--> statement-breakpoint
ALTER TABLE "credits" DROP CONSTRAINT "search_credit_check";--> statement-breakpoint
ALTER TABLE "credits" ADD COLUMN "credits" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "credits" DROP COLUMN IF EXISTS "enrichment";--> statement-breakpoint
ALTER TABLE "credits" DROP COLUMN IF EXISTS "search";--> statement-breakpoint
ALTER TABLE "credits" ADD CONSTRAINT "credits_credit_check" CHECK (credits >= 0);--> statement-breakpoint
UPDATE "credits" SET "credits" = CASE 
  WHEN s.plan = 'ESSENTIALS' THEN 1000
  WHEN s.plan = 'PRO' THEN 3000
  ELSE 100
END
FROM "subscription" s
WHERE "credits"."user_id" = s."user_id" AND s."status" = 'active';
--> statement-breakpoint
UPDATE "credits" SET "credits" = 100
WHERE "credits" = 0;
--> statement-breakpoint