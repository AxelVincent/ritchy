CREATE INDEX IF NOT EXISTS "idx_contact_user_place_id" ON "contact" USING btree ("user_place_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_email_contact_id" ON "contact_email" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_phone_contact_id" ON "contact_phone" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_social_media_contact_id" ON "contact_social_media" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_list_user_id" ON "list" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_list_place_user_place_id" ON "list_place" USING btree ("user_place_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_list_place_search_id" ON "list_place" USING btree ("search_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_place_place_id" ON "user_place" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_place_user_id" ON "user_place" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_search_user_id" ON "search" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_search_place_search_id" ON "search_place" USING btree ("search_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_search_place_user_place_id" ON "search_place" USING btree ("user_place_id");