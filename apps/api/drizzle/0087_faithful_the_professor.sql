DO $$ BEGIN
 ALTER TABLE "enrichment_technology" ADD CONSTRAINT "enrichment_technology_pattern_id_technology_pattern_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."technology_pattern"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
