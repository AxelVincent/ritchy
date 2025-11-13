CREATE TABLE IF NOT EXISTS "enrichment_company_officer_email" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"officer_id" uuid NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrichment_company_officer_email" ADD CONSTRAINT "enrichment_company_officer_email_officer_id_enrichment_company_officer_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."enrichment_company_officer"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
