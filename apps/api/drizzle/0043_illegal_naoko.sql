CREATE TABLE IF NOT EXISTS "contact_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"email" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"email_type" text,
	"source" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_socials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"profile_url" text NOT NULL,
	"username" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"source" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_emails" ADD CONSTRAINT "contact_emails_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_socials" ADD CONSTRAINT "contact_socials_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_contact_emails_primary" ON "contact_emails" USING btree ("contact_id") WHERE "contact_emails"."is_primary" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_emails_contact_id" ON "contact_emails" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_emails_email" ON "contact_emails" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_emails_contact_id_email" ON "contact_emails" USING btree ("contact_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_contact_socials_primary" ON "contact_socials" USING btree ("contact_id") WHERE "contact_socials"."is_primary" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_socials_contact_id" ON "contact_socials" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_socials_platform" ON "contact_socials" USING btree ("platform");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_socials_contact_id_platform" ON "contact_socials" USING btree ("contact_id","platform");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_socials_url" ON "contact_socials" USING btree ("profile_url");