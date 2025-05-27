CREATE TABLE IF NOT EXISTS "version_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" text NOT NULL,
	"record_id" uuid NOT NULL,
	"record_data" jsonb NOT NULL,
	"user_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "version_history" ADD CONSTRAINT "version_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_version_history_table_record" ON "version_history" USING btree ("table_name","record_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_version_history_user_id" ON "version_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_version_history_created_at" ON "version_history" USING btree ("created_at");