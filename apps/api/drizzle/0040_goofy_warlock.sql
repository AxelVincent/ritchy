CREATE TYPE "public"."internal_field" AS ENUM('company.name', 'company.website', 'company.country', 'company.postalCode', 'company.street', 'company.locality', 'company.region', 'company.phone', 'contact.firstname', 'contact.lastname', 'contact.email', 'contact.phone', 'contact.status.NEW', 'contact.status.NO_ANSWER', 'contact.status.CONTACTED', 'contact.status.FOLLOW_UP', 'contact.status.MEETING', 'contact.status.INTERESTED', 'contact.status.WON', 'contact.status.LOST');--> statement-breakpoint
ALTER TYPE "public"."webhook_service" ADD VALUE 'hubspot';--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"firstname" text,
	"lastname" text,
	"email" text,
	"phone" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hubspot_company_mapping" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" text NOT NULL,
	"hubspot_company_id" text NOT NULL,
	"token_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hubspot_contact_mapping" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" text NOT NULL,
	"hubspot_contact_id" text NOT NULL,
	"token_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hubspot_field_mapping" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_id" uuid NOT NULL,
	"internal_field" "internal_field" NOT NULL,
	"hubspot_field" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hubspot_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hubspot_token_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact" ADD CONSTRAINT "contact_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hubspot_company_mapping" ADD CONSTRAINT "hubspot_company_mapping_token_id_hubspot_token_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."hubspot_token"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hubspot_contact_mapping" ADD CONSTRAINT "hubspot_contact_mapping_token_id_hubspot_token_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."hubspot_token"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hubspot_field_mapping" ADD CONSTRAINT "hubspot_field_mapping_token_id_hubspot_token_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."hubspot_token"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hubspot_token" ADD CONSTRAINT "hubspot_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_user_place_contact" ON "contact" USING btree ("user_id","place_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_place_company" ON "hubspot_company_mapping" USING btree ("place_id","hubspot_company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hubspot_company_place_id" ON "hubspot_company_mapping" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hubspot_company_id" ON "hubspot_company_mapping" USING btree ("hubspot_company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hubspot_company_token_id" ON "hubspot_company_mapping" USING btree ("token_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_place_contact" ON "hubspot_contact_mapping" USING btree ("place_id","hubspot_contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hubspot_contact_place_id" ON "hubspot_contact_mapping" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hubspot_contact_id" ON "hubspot_contact_mapping" USING btree ("hubspot_contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hubspot_contact_token_id" ON "hubspot_contact_mapping" USING btree ("token_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_token_field_mapping" ON "hubspot_field_mapping" USING btree ("token_id","internal_field");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hubspot_field_mapping_token_id" ON "hubspot_field_mapping" USING btree ("token_id");