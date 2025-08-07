ALTER TABLE "enrichment_email" ADD COLUMN "quality" text;--> statement-breakpoint
ALTER TABLE "enrichment_email" ADD COLUMN "result" text;--> statement-breakpoint
ALTER TABLE "enrichment_email" ADD COLUMN "role" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "enrichment_email" ADD COLUMN "free" boolean DEFAULT false NOT NULL;