CREATE TABLE IF NOT EXISTS "api_key" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	CONSTRAINT "api_key_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"method" text NOT NULL,
	"status_code" integer NOT NULL,
	"credits_used" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_key" ADD CONSTRAINT "api_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_api_key_id_api_key_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_key"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_key_user_id" ON "api_key" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_key_key_hash" ON "api_key" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_key_is_active" ON "api_key" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_usage_api_key_id" ON "api_usage" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_usage_created_at" ON "api_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_usage_api_key_created" ON "api_usage" USING btree ("api_key_id","created_at");
