ALTER TABLE "enrichment" ADD COLUMN "score" integer;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enrichment_score_index" ON "enrichment" USING btree ("score");