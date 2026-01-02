CREATE TYPE "public"."enrichment_phase_status" AS ENUM('idle', 'queued', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_linkedin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"profile_url" text NOT NULL,
	"confidence" integer NOT NULL,
	"reasoning" text,
	"source" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contact_linkedin_contact_id_profile_url_unique" UNIQUE("contact_id","profile_url")
);
--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "enriched_at" timestamp;--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "enrichment_status" "enrichment_phase_status" DEFAULT 'idle';--> statement-breakpoint
ALTER TABLE "contact" ADD COLUMN "linkedin_url" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_linkedin" ADD CONSTRAINT "contact_linkedin_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_linkedin_contact_id" ON "contact_linkedin" USING btree ("contact_id");