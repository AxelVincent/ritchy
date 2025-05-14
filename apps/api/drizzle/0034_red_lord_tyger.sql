CREATE TABLE IF NOT EXISTS "user_demo_code" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"is_validated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"validated_at" timestamp,
	CONSTRAINT "user_demo_code_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_demo_code" ADD CONSTRAINT "user_demo_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_demo_code_user_id" ON "user_demo_code" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_demo_code_code" ON "user_demo_code" USING btree ("code");

--> statement-breakpoint
-- Backfill user_demo_code for existing users, marking them as validated.
-- This ensures existing users are not prompted for a demo code.
INSERT INTO "user_demo_code" ("user_id", "code", "is_validated", "created_at", "validated_at")
SELECT
    u.id,                                  -- The user's ID
    'EXISTING_USER_PREVALIDATED',          -- A placeholder code indicating auto-validation
    true,                                  -- Mark as validated
    COALESCE(u.created_at, now()),         -- Use user's creation date if available, else now
    now()                                  -- Set validated_at to current time
FROM
    "user" u
LEFT JOIN
    "user_demo_code" udc ON u.id = udc.user_id
WHERE
    udc.user_id IS NULL; -- Only insert for users who don't already have a demo code record