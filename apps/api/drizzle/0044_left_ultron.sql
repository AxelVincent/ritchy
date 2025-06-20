ALTER TABLE "contact_emails" RENAME TO "contact_email";--> statement-breakpoint
ALTER TABLE "contact_socials" RENAME TO "contact_social";--> statement-breakpoint
ALTER TABLE "contact_email" DROP CONSTRAINT "contact_emails_contact_id_contact_id_fk";
--> statement-breakpoint
ALTER TABLE "contact_social" DROP CONSTRAINT "contact_socials_contact_id_contact_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contact_emails_primary";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contact_emails_contact_id";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contact_emails_email";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contact_emails_contact_id_email";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contact_socials_primary";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contact_socials_contact_id";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contact_socials_platform";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contact_socials_contact_id_platform";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contact_socials_url";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_email" ADD CONSTRAINT "contact_email_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_social" ADD CONSTRAINT "contact_social_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_contact_email_primary" ON "contact_email" USING btree ("contact_id") WHERE "contact_email"."is_primary" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_email_contact_id" ON "contact_email" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_email_email" ON "contact_email" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_email_contact_id_email" ON "contact_email" USING btree ("contact_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_contact_social_primary" ON "contact_social" USING btree ("contact_id") WHERE "contact_social"."is_primary" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_social_contact_id" ON "contact_social" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_social_platform" ON "contact_social" USING btree ("platform");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_social_contact_id_platform" ON "contact_social" USING btree ("contact_id","platform");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_social_url" ON "contact_social" USING btree ("profile_url");