CREATE TABLE IF NOT EXISTS "enrichment_company_officer_phone" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"officer_id" uuid NOT NULL,
	"phone" text NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "enrichment_company_officer_phone_officer_id_phone_unique" UNIQUE("officer_id","phone")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "forager_phone_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"linkedin_public_identifier" text NOT NULL,
	"phone_numbers" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "forager_phone_cache_linkedin_public_identifier_unique" UNIQUE("linkedin_public_identifier")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrichment_company_officer_phone" ADD CONSTRAINT "enrichment_company_officer_phone_officer_id_enrichment_company_officer_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."enrichment_company_officer"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "forager_phone_cache_linkedin_public_identifier_index" ON "forager_phone_cache" USING btree ("linkedin_public_identifier");