CREATE TABLE IF NOT EXISTS "enrichment_company_officer_linkedin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"officer_id" uuid NOT NULL,
	"profile_url" text NOT NULL,
	"confidence" integer NOT NULL,
	"reasoning" text,
	"source" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "enrichment_company_officer_linkedin_officer_id_profile_url_unique" UNIQUE("officer_id","profile_url")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrichment_company_officer_linkedin" ADD CONSTRAINT "enrichment_company_officer_linkedin_officer_id_enrichment_company_officer_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."enrichment_company_officer"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
