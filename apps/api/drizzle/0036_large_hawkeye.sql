ALTER TABLE "version_history" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "version_history" ADD COLUMN "version" integer NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_record_version" ON "version_history" USING btree ("table_name","record_id","version");