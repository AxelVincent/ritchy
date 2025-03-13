ALTER TABLE "list_place" ADD COLUMN "search_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "list_place" ADD CONSTRAINT "list_place_search_id_search_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."search"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
