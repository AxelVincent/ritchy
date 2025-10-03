CREATE TABLE IF NOT EXISTS "enrichment_company" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrichment_id" uuid NOT NULL,
	"reasoning" text,
	"confidence_score" integer,
	"company_number" text NOT NULL,
	"country_code" text NOT NULL,
	"country" text,
	"state" text,
	"lei" text,
	"isin" text,
	"vat_number" text,
	"name" text NOT NULL,
	"trade_name" text,
	"acronym" text,
	"legal_form_code" text,
	"local_legal_form_code" text,
	"local_legal_form_name" text,
	"type" text,
	"status" text NOT NULL,
	"date_of_creation" timestamp,
	"date_of_cessation" timestamp,
	"workforce" integer,
	"workforce_range" text,
	"head_office_address_line_1" text,
	"head_office_address_line_2" text,
	"head_office_postal_code" text,
	"head_office_city" text,
	"head_office_country" text,
	"head_office_country_code" text,
	"commercial_register_registration_status" text,
	"commercial_register_registration_location" text,
	"commercial_register_registration_date" timestamp,
	"commercial_register_cessation_date" timestamp,
	"share_capital" numeric,
	"share_capital_currency" text,
	"fiscal_year_end" text,
	"next_fiscal_year_end" text,
	"fields_of_activity" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "enrichment_company_enrichment_id_unique" UNIQUE("enrichment_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enrichment_company_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"code" text,
	"name" text,
	"type" text DEFAULT 'standard' NOT NULL,
	"classification" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enrichment_company_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"type" text,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enrichment_company_establishment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"number" text,
	"name" text,
	"trade_name" text,
	"acronym" text,
	"fields_of_activity" text,
	"date_of_creation" timestamp,
	"status" text,
	"date_of_cessation" timestamp,
	"address_line_1" text,
	"address_line_2" text,
	"postal_code" text,
	"city" text,
	"country" text,
	"country_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enrichment_company_officer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"type" text,
	"role" text,
	"mention" text,
	"date_of_appointment" timestamp,
	"last_name" text,
	"first_name" text,
	"gender" text,
	"date_of_birth" timestamp,
	"date_of_birth_format" text,
	"nationality" text,
	"nationality_code" text,
	"company_name" text,
	"company_number" text,
	"address_line_1" text,
	"address_line_2" text,
	"postal_code" text,
	"city" text,
	"country" text,
	"country_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enrichment_company_ubo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"last_name" text,
	"first_name" text,
	"gender" text,
	"date_of_birth" timestamp,
	"date_of_birth_format" text,
	"nationality" text,
	"nationality_code" text,
	"address_line_1" text,
	"address_line_2" text,
	"postal_code" text,
	"city" text,
	"country" text,
	"country_code" text,
	"percentage_of_shares" numeric,
	"voting_percentage" numeric,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrichment_company" ADD CONSTRAINT "enrichment_company_enrichment_id_enrichment_id_fk" FOREIGN KEY ("enrichment_id") REFERENCES "public"."enrichment"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrichment_company_activity" ADD CONSTRAINT "enrichment_company_activity_company_id_enrichment_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."enrichment_company"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrichment_company_contact" ADD CONSTRAINT "enrichment_company_contact_company_id_enrichment_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."enrichment_company"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrichment_company_establishment" ADD CONSTRAINT "enrichment_company_establishment_company_id_enrichment_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."enrichment_company"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrichment_company_officer" ADD CONSTRAINT "enrichment_company_officer_company_id_enrichment_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."enrichment_company"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrichment_company_ubo" ADD CONSTRAINT "enrichment_company_ubo_company_id_enrichment_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."enrichment_company"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
