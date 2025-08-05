-- Remove duplicate emails keeping the most recent one
DELETE FROM contact_email a USING contact_email b
WHERE a.contact_id = b.contact_id 
  AND a.email = b.email 
  AND a.created_at < b.created_at;
--> statement-breakpoint

-- Ensure only one primary email per contact (keep most recent)
UPDATE contact_email e1
SET is_primary = false
WHERE EXISTS (
  SELECT 1 FROM contact_email e2
  WHERE e2.contact_id = e1.contact_id
    AND e2.is_primary = true
    AND e2.updated_at > e1.updated_at
    AND e1.is_primary = true
);
--> statement-breakpoint

-- Remove duplicate phones keeping the most recent one
DELETE FROM contact_phone a USING contact_phone b
WHERE a.contact_id = b.contact_id 
  AND a.phone = b.phone 
  AND a.type = b.type 
  AND a.created_at < b.created_at;
--> statement-breakpoint

-- Ensure only one primary phone per contact (keep most recent)
UPDATE contact_phone p1
SET is_primary = false
WHERE EXISTS (
  SELECT 1 FROM contact_phone p2
  WHERE p2.contact_id = p1.contact_id
    AND p2.is_primary = true
    AND p2.updated_at > p1.updated_at
    AND p1.is_primary = true
);
--> statement-breakpoint

-- Remove duplicate social media entries keeping the most recent one
DELETE FROM contact_social_media a USING contact_social_media b
WHERE a.contact_id = b.contact_id 
  AND a.social_media_platform = b.social_media_platform 
  AND a.url = b.url 
  AND a.created_at < b.created_at;
--> statement-breakpoint

-- Ensure only one primary social media per contact (keep most recent)
UPDATE contact_social_media s1
SET is_primary = false
WHERE EXISTS (
  SELECT 1 FROM contact_social_media s2
  WHERE s2.contact_id = s1.contact_id
    AND s2.is_primary = true
    AND s2.updated_at > s1.updated_at
    AND s1.is_primary = true
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "one_primary_email_per_contact" ON "contact_email" USING btree ("contact_id") WHERE "contact_email"."is_primary" = true;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "one_primary_phone_per_contact" ON "contact_phone" USING btree ("contact_id") WHERE "contact_phone"."is_primary" = true;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "one_primary_social_media_per_contact" ON "contact_social_media" USING btree ("contact_id") WHERE "contact_social_media"."is_primary" = true;--> statement-breakpoint
ALTER TABLE "contact_email" ADD CONSTRAINT "contact_email_contact_id_email_unique" UNIQUE("contact_id","email");--> statement-breakpoint
ALTER TABLE "contact_phone" ADD CONSTRAINT "contact_phone_contact_id_phone_type_unique" UNIQUE("contact_id","phone","type");--> statement-breakpoint
ALTER TABLE "contact_social_media" ADD CONSTRAINT "contact_social_media_contact_id_social_media_platform_url_unique" UNIQUE("contact_id","social_media_platform","url");