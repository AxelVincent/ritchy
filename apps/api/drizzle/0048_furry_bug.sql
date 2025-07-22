CREATE TYPE "public"."phone_type" AS ENUM('mobile', 'home', 'work');--> statement-breakpoint
CREATE TYPE "public"."place_source" AS ENUM('google');--> statement-breakpoint
CREATE TYPE "public"."social_platform" AS ENUM('LINKEDIN', 'FACEBOOK', 'INSTAGRAM');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_phone" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"phone" text NOT NULL,
	"type" "phone_type" NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enrichment_email" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrichment_id" uuid NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enrichment_facebook" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrichment_id" uuid NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enrichment_instagram" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrichment_id" uuid NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enrichment_linkedin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrichment_id" uuid NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enrichment_phone" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrichment_id" uuid NOT NULL,
	"phone" text NOT NULL,
	"type" "phone_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "place" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "place_source" NOT NULL,
	"source_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "place_source_id_unique" UNIQUE("source_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_place" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"place_id" uuid NOT NULL,
	"is_enriched" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_place_place_id_user_id_unique" UNIQUE("place_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "search_place" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"search_id" uuid NOT NULL,
	"user_place_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- -- Migrate data to place table -- --
INSERT INTO "place" ("source", "source_id")
SELECT 'google', place_id from "list_place"
ON CONFLICT DO NOTHING;

INSERT INTO "place" ("source", "source_id")
SELECT 'google', place_id from "enrichment"
ON CONFLICT DO NOTHING;

INSERT INTO "place" ("source", "source_id")
SELECT 'google', place_id from "status"
ON CONFLICT DO NOTHING;

INSERT INTO "place" ("source", "source_id")
SELECT 'google', place_id from "note"
ON CONFLICT DO NOTHING;

INSERT INTO "place" ("source", "source_id")
SELECT 'google', place_id from "hubspot_lead_mapping"
ON CONFLICT DO NOTHING;

INSERT INTO "place" ("source", "source_id")
SELECT 'google', place_id from "contact"
ON CONFLICT DO NOTHING;

-- -- Migrate data to user_place table -- --
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_user_place" ON "user_place" USING btree ("user_id","place_id");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_place" ADD CONSTRAINT "user_place_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_place" ADD CONSTRAINT "user_place_place_id_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."place"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
INSERT INTO "user_place" ("user_id", "place_id")
SELECT user_id, p.id from "list_place" lp
JOIN "place" p on p.source_id = lp.place_id
JOIN "list" l on l.id = lp.list_id
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "user_place" ("user_id", "place_id", "is_enriched")
select user_id, p.id, true from "enrichment" e
JOIN "place" p on p.source_id = e.place_id
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "user_place" ("user_id", "place_id")
select user_id, p.id from "status" s
JOIN "place" p on p.source_id = s.place_id
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "user_place" ("user_id", "place_id")
select user_id, p.id from "note" n
JOIN "place" p on p.source_id = n.place_id
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "user_place" ("user_id", "place_id")
select user_id, p.id from "hubspot_lead_mapping" hlm 
join hubspot_token ht on hlm.token_id = ht.id
JOIN "place" p on p.source_id = hlm.place_id
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "user_place" ("user_id", "place_id")
select user_id, p.id from "contact"
JOIN "place" p on p.source_id = contact.place_id
ON CONFLICT DO NOTHING;

-- -- Fill back user_place_id in list_place, note, status, enrichment, contact -- --
ALTER TABLE "contact" ADD COLUMN "user_place_id" uuid;--> statement-breakpoint
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact" ADD CONSTRAINT "contact_user_place_id_user_place_id_fk" FOREIGN KEY ("user_place_id") REFERENCES "public"."user_place"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
UPDATE "contact" c
SET "user_place_id" = up.id
FROM "user_place" up
JOIN "place" p ON up.place_id = p.id
WHERE c.user_id = up.user_id
AND c.place_id = p.source_id;
-- Add NOT NULL constraint
ALTER TABLE "contact" ALTER COLUMN "user_place_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "list_place" ADD COLUMN "user_place_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "list_place" ADD CONSTRAINT "list_place_user_place_id_user_place_id_fk" FOREIGN KEY ("user_place_id") REFERENCES "public"."user_place"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "list_place" ADD CONSTRAINT "list_place_list_id_user_place_id_unique" UNIQUE("list_id","user_place_id");
--> statement-breakpoint
UPDATE "list_place" lp
SET "user_place_id" = up.id
FROM "user_place" up
JOIN "place" p ON up.place_id = p.id
WHERE lp.list_id IN (SELECT id FROM "list" WHERE user_id = up.user_id)
AND lp.place_id = p.source_id;
-- Add NOT NULL constraint
ALTER TABLE "list_place" ALTER COLUMN "user_place_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "note" ADD COLUMN "user_place_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "note" ADD CONSTRAINT "note_user_place_id_user_place_id_fk" FOREIGN KEY ("user_place_id") REFERENCES "public"."user_place"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
UPDATE "note" n
SET "user_place_id" = up.id
FROM "user_place" up
JOIN "place" p ON up.place_id = p.id
WHERE n.user_id = up.user_id
AND n.place_id = p.source_id;
-- Add NOT NULL constraint
ALTER TABLE "note" ALTER COLUMN "user_place_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "status" ADD COLUMN "user_place_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "status" ADD CONSTRAINT "status_user_place_id_user_place_id_fk" FOREIGN KEY ("user_place_id") REFERENCES "public"."user_place"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "status" ADD CONSTRAINT "status_user_place_id_status_unique" UNIQUE("user_place_id","status");
--> statement-breakpoint
UPDATE "status" s
SET "user_place_id" = up.id
FROM "user_place" up
JOIN "place" p ON up.place_id = p.id
WHERE s.user_id = up.user_id
AND s.place_id = p.source_id;
-- Add NOT NULL constraint
ALTER TABLE "status" ALTER COLUMN "user_place_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "hubspot_lead_mapping" ADD COLUMN "user_place_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hubspot_lead_mapping" ADD CONSTRAINT "hubspot_lead_mapping_user_place_id_user_place_id_fk" FOREIGN KEY ("user_place_id") REFERENCES "public"."user_place"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hubspot_lead_mapping" ADD CONSTRAINT "hubspot_lead_mapping_hubspot_token_id_hubspot_token_id_fk" FOREIGN KEY ("hubspot_token_id") REFERENCES "public"."hubspot_token"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "hubspot_lead_mapping" ADD CONSTRAINT "hubspot_lead_mapping_user_place_id_hubspot_token_id_unique" UNIQUE("user_place_id","hubspot_token_id");
--> statement-breakpoint
UPDATE "hubspot_lead_mapping" hlm
SET "user_place_id" = up.id
FROM "user_place" up
JOIN "place" p ON up.place_id = p.id
WHERE hlm.place_id = p.source_id;
-- Add NOT NULL constraint
ALTER TABLE "hubspot_lead_mapping" ALTER COLUMN "user_place_id" SET NOT NULL;
-- -- Fill back enrichment.place_id -- --
UPDATE "user_place" up
SET "is_enriched" = true
FROM "enrichment" e
JOIN "place" p ON e.place_id = p.source_id
WHERE up.place_id = p.id
AND up.user_id = e.user_id;
-- -- Fill back enrichment.place_id -- --
UPDATE "enrichment" e
SET "place_id" = p.id
FROM "place" p
WHERE e.place_id = p.source_id;
-- Cast place_id to uuid
ALTER TABLE "enrichment" ALTER COLUMN "place_id" SET DATA TYPE uuid USING place_id::uuid;
-- -- Add NOT NULL constraint
ALTER TABLE "enrichment" ALTER COLUMN "place_id" SET NOT NULL;


--> statement-breakpoint
ALTER TABLE "contact_social" RENAME TO "contact_social_media";--> statement-breakpoint
ALTER TABLE "contact" RENAME COLUMN "firstname" TO "first_name";--> statement-breakpoint
ALTER TABLE "contact" RENAME COLUMN "lastname" TO "last_name";--> statement-breakpoint
ALTER TABLE "contact_social_media" RENAME COLUMN "platform" TO "social_media_platform";--> statement-breakpoint
ALTER TABLE "contact_social_media" RENAME COLUMN "profile_url" TO "url";--> statement-breakpoint
ALTER TABLE "enrichment" RENAME COLUMN "website" TO "domain";--> statement-breakpoint
ALTER TABLE "hubspot_field_mapping" RENAME COLUMN "token_id" TO "hubspot_token_id";--> statement-breakpoint
ALTER TABLE "hubspot_lead_mapping" RENAME COLUMN "token_id" TO "hubspot_token_id";--> statement-breakpoint
ALTER TABLE "contact" DROP CONSTRAINT "contact_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "contact_social_media" DROP CONSTRAINT "contact_social_contact_id_contact_id_fk";
--> statement-breakpoint
ALTER TABLE "enrichment" DROP CONSTRAINT "enrichment_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "hubspot_field_mapping" DROP CONSTRAINT "hubspot_field_mapping_token_id_hubspot_token_id_fk";
--> statement-breakpoint
ALTER TABLE "hubspot_lead_mapping" DROP CONSTRAINT "hubspot_lead_mapping_token_id_hubspot_token_id_fk";
--> statement-breakpoint
ALTER TABLE "status" DROP CONSTRAINT "status_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "uniq_user_place_contact";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contact_email_primary";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contact_email_contact_id";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contact_email_email";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contact_email_contact_id_email";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contact_social_primary";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contact_social_contact_id";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contact_social_platform";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contact_social_contact_id_platform";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_contact_social_url";--> statement-breakpoint
DROP INDEX IF EXISTS "uniq_user_place";--> statement-breakpoint
DROP INDEX IF EXISTS "uniq_token_field_mapping";--> statement-breakpoint
DROP INDEX IF EXISTS "uniq_place_lead";--> statement-breakpoint
DROP INDEX IF EXISTS "uniq_list_place";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_note_place_id";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_note_place_user";--> statement-breakpoint
DROP INDEX IF EXISTS "uniq_user_place_status";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_place_user_status";--> statement-breakpoint
DROP INDEX IF EXISTS "uniq_stripe_subscription_id";--> statement-breakpoint
DROP INDEX IF EXISTS "uniq_stripe_customer_id";--> statement-breakpoint
DROP INDEX IF EXISTS "uniq_user_id";--> statement-breakpoint
DROP INDEX IF EXISTS "uniq_clerk_id";--> statement-breakpoint
DROP INDEX IF EXISTS "uniq_idempotency_key";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_hubspot_field_mapping_token_id";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_hubspot_lead_place_id";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_hubspot_lead_token_id";--> statement-breakpoint
ALTER TABLE "enrichment" ALTER COLUMN "place_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "enrichment" ADD COLUMN "domain_registered_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_phone" ADD CONSTRAINT "contact_phone_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrichment_email" ADD CONSTRAINT "enrichment_email_enrichment_id_enrichment_id_fk" FOREIGN KEY ("enrichment_id") REFERENCES "public"."enrichment"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrichment_facebook" ADD CONSTRAINT "enrichment_facebook_enrichment_id_enrichment_id_fk" FOREIGN KEY ("enrichment_id") REFERENCES "public"."enrichment"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrichment_instagram" ADD CONSTRAINT "enrichment_instagram_enrichment_id_enrichment_id_fk" FOREIGN KEY ("enrichment_id") REFERENCES "public"."enrichment"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrichment_linkedin" ADD CONSTRAINT "enrichment_linkedin_enrichment_id_enrichment_id_fk" FOREIGN KEY ("enrichment_id") REFERENCES "public"."enrichment"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrichment_phone" ADD CONSTRAINT "enrichment_phone_enrichment_id_enrichment_id_fk" FOREIGN KEY ("enrichment_id") REFERENCES "public"."enrichment"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "search_place" ADD CONSTRAINT "search_place_search_id_search_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."search"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "search_place" ADD CONSTRAINT "search_place_user_place_id_user_place_id_fk" FOREIGN KEY ("user_place_id") REFERENCES "public"."user_place"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_social_media" ADD CONSTRAINT "contact_social_media_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrichment" ADD CONSTRAINT "enrichment_place_id_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."place"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hubspot_field_mapping" ADD CONSTRAINT "hubspot_field_mapping_hubspot_token_id_hubspot_token_id_fk" FOREIGN KEY ("hubspot_token_id") REFERENCES "public"."hubspot_token"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_note_user_place_id" ON "note" USING btree ("user_place_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_note_user_place" ON "note" USING btree ("user_place_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_place_status" ON "status" USING btree ("user_place_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hubspot_field_mapping_token_id" ON "hubspot_field_mapping" USING btree ("hubspot_token_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hubspot_lead_place_id" ON "hubspot_lead_mapping" USING btree ("user_place_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_hubspot_lead_token_id" ON "hubspot_lead_mapping" USING btree ("hubspot_token_id");--> statement-breakpoint
ALTER TABLE "contact" DROP COLUMN IF EXISTS "place_id";--> statement-breakpoint
ALTER TABLE "contact" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
ALTER TABLE "contact" DROP COLUMN IF EXISTS "email";--> statement-breakpoint
ALTER TABLE "contact" DROP COLUMN IF EXISTS "phone";--> statement-breakpoint
ALTER TABLE "contact_email" DROP COLUMN IF EXISTS "email_type";--> statement-breakpoint
ALTER TABLE "contact_email" DROP COLUMN IF EXISTS "source";--> statement-breakpoint
ALTER TABLE "contact_social_media" DROP COLUMN IF EXISTS "username";--> statement-breakpoint
ALTER TABLE "contact_social_media" DROP COLUMN IF EXISTS "source";--> statement-breakpoint
ALTER TABLE "enrichment" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
ALTER TABLE "hubspot_lead_mapping" DROP COLUMN IF EXISTS "place_id";--> statement-breakpoint
ALTER TABLE "list_place" DROP COLUMN IF EXISTS "place_id";--> statement-breakpoint
ALTER TABLE "note" DROP COLUMN IF EXISTS "place_id";--> statement-breakpoint
ALTER TABLE "status" DROP COLUMN IF EXISTS "place_id";--> statement-breakpoint
ALTER TABLE "status" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
ALTER TABLE "enrichment" ADD CONSTRAINT "enrichment_place_id_unique" UNIQUE("place_id");--> statement-breakpoint
ALTER TABLE "hubspot_field_mapping" ADD CONSTRAINT "hubspot_field_mapping_hubspot_token_id_internal_field_unique" UNIQUE("hubspot_token_id","internal_field");--> statement-breakpoint
