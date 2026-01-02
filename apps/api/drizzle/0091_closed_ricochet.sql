ALTER TABLE "enrichment" ADD COLUMN "company_enriched_at" timestamp;--> statement-breakpoint
ALTER TABLE "enrichment" ADD COLUMN "company_status" "enrichment_phase_status" DEFAULT 'idle';--> statement-breakpoint
ALTER TABLE "enrichment_company_officer" ADD COLUMN "enriched_at" timestamp;--> statement-breakpoint
ALTER TABLE "enrichment_company_officer" ADD COLUMN "enrichment_status" "enrichment_phase_status" DEFAULT 'idle';