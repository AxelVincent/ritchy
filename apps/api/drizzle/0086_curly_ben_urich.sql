CREATE TABLE IF NOT EXISTS "enrichment_technology" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrichment_id" uuid NOT NULL,
	"technology" text NOT NULL,
	"category" text NOT NULL,
	"confidence" integer NOT NULL,
	"evidence" text,
	"pattern_id" uuid,
	"detection_method" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "enrichment_technology_enrichment_id_technology_unique" UNIQUE("enrichment_id","technology")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "technology_pattern" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"technology" text NOT NULL,
	"category" text NOT NULL,
	"pattern" text NOT NULL,
	"pattern_type" text NOT NULL,
	"match_count" integer DEFAULT 0 NOT NULL,
	"confirmed_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "technology_pattern_technology_pattern_unique" UNIQUE("technology","pattern")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrichment_technology" ADD CONSTRAINT "enrichment_technology_enrichment_id_enrichment_id_fk" FOREIGN KEY ("enrichment_id") REFERENCES "public"."enrichment"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enrichment_technology_enrichment_id_index" ON "enrichment_technology" USING btree ("enrichment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enrichment_technology_enrichment_id_category_index" ON "enrichment_technology" USING btree ("enrichment_id","category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "technology_pattern_confirmed_count_index" ON "technology_pattern" USING btree ("confirmed_count");