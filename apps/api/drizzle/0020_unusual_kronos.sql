CREATE TABLE IF NOT EXISTS "enrichment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"place_id" text NOT NULL,
	"website" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrichment" ADD CONSTRAINT "enrichment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_user_place" ON "enrichment" USING btree ("user_id","place_id");--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "user_id_new";--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_clerk_id_unique" UNIQUE("clerk_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_email_unique" UNIQUE("email");