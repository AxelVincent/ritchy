ALTER TABLE "enrichment" DROP CONSTRAINT IF EXISTS "enrichment_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "list" DROP CONSTRAINT IF EXISTS "list_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "list_place" DROP CONSTRAINT IF EXISTS "list_place_list_id_list_id_fk";
--> statement-breakpoint
ALTER TABLE "note" DROP CONSTRAINT IF EXISTS "note_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "search" DROP CONSTRAINT IF EXISTS "search_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "status" DROP CONSTRAINT IF EXISTS "status_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "subscription" DROP CONSTRAINT IF EXISTS "subscription_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "list" ALTER COLUMN "user_id" TYPE uuid USING user_id::uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrichment" ADD CONSTRAINT "enrichment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "list" ADD CONSTRAINT "list_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "list_place" ADD CONSTRAINT "list_place_list_id_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."list"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "note" ADD CONSTRAINT "note_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "search" ADD CONSTRAINT "search_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "status" ADD CONSTRAINT "status_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
