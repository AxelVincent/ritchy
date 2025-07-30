ALTER TABLE "enrichment" ADD COLUMN "success" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "enrichment" ADD COLUMN "error" text;--> statement-breakpoint
ALTER TABLE "enrichment_email" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "enrichment_facebook" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "enrichment_instagram" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "enrichment_linkedin" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "enrichment_phone" ADD COLUMN "source" text;