ALTER TABLE "enrichment_company_officer_email" ADD COLUMN "is_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "enrichment_company_officer_email" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "enrichment_company_officer_email" ADD COLUMN "quality" "email_quality";--> statement-breakpoint
ALTER TABLE "enrichment_company_officer_email" ADD COLUMN "result" "email_result";--> statement-breakpoint
ALTER TABLE "enrichment_company_officer_email" ADD COLUMN "role" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "enrichment_company_officer_email" ADD COLUMN "free" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "enrichment_company_officer_email" ADD CONSTRAINT "enrichment_company_officer_email_officer_id_email_unique" UNIQUE("officer_id","email");