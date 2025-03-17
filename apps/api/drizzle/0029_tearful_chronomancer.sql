CREATE INDEX IF NOT EXISTS "idx_note_place_id" ON "note" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_note_user_id" ON "note" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_note_place_user" ON "note" USING btree ("place_id","user_id");