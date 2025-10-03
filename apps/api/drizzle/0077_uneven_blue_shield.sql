ALTER TABLE "enrichment" ADD COLUMN "is_stale" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enrichment_is_stale_index" ON "enrichment" USING btree ("is_stale");