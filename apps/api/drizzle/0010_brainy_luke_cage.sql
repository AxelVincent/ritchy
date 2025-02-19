CREATE TABLE IF NOT EXISTS "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
-- Add temporary UUID columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'list' AND column_name = 'user_id_new') THEN
        ALTER TABLE "list" ADD COLUMN "user_id_new" uuid;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'note' AND column_name = 'user_id_new') THEN
        ALTER TABLE "note" ADD COLUMN "user_id_new" uuid;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'search' AND column_name = 'user_id_new') THEN
        ALTER TABLE "search" ADD COLUMN "user_id_new" uuid;
    END IF;
END $$;
--> statement-breakpoint
-- Add foreign key constraints for new columns
DO $$ BEGIN
 ALTER TABLE "list" ADD CONSTRAINT "list_user_id_new_user_id_fk" FOREIGN KEY ("user_id_new") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "note" ADD CONSTRAINT "note_user_id_new_user_id_fk" FOREIGN KEY ("user_id_new") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "search" ADD CONSTRAINT "search_user_id_new_user_id_fk" FOREIGN KEY ("user_id_new") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_clerk_id" ON "user" USING btree ("clerk_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_email" ON "user" USING btree ("email");
