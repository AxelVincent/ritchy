CREATE TABLE IF NOT EXISTS "hubspot_lead_mapping" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" text NOT NULL,
	"hubspot_company_id" text NOT NULL,
	"hubspot_contact_id" text,
	"token_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "hubspot_company_mapping" CASCADE;--> statement-breakpoint
DROP TABLE "hubspot_contact_mapping" CASCADE;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hubspot_lead_mapping" ADD CONSTRAINT "hubspot_lead_mapping_token_id_hubspot_token_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."hubspot_token"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_place_lead" ON "hubspot_lead_mapping" USING btree ("place_id","token_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hubspot_lead_place_id" ON "hubspot_lead_mapping" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hubspot_lead_company_id" ON "hubspot_lead_mapping" USING btree ("hubspot_company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hubspot_lead_contact_id" ON "hubspot_lead_mapping" USING btree ("hubspot_contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hubspot_lead_token_id" ON "hubspot_lead_mapping" USING btree ("token_id");