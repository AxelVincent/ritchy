CREATE TYPE "public"."contact_type" AS ENUM('physical', 'legal');--> statement-breakpoint
ALTER TABLE "enrichment_company_officer" ALTER COLUMN "type" SET DATA TYPE contact_type USING type::contact_type;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "officer_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact" ADD CONSTRAINT "contact_officer_id_enrichment_company_officer_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."enrichment_company_officer"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
