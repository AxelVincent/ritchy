CREATE TABLE IF NOT EXISTS "enrichment_company_financial" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"type" text,
	"financials_start_date" timestamp,
	"financials_end_date" timestamp,
	"deposit_date" timestamp,
	"currency" text,
	"availability" text,
	"ratios" jsonb,
	"related_documents" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrichment_company_financial" ADD CONSTRAINT "enrichment_company_financial_company_id_enrichment_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."enrichment_company"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
