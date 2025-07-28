ALTER TABLE "enrichment_email" ADD CONSTRAINT "enrichment_email_enrichment_id_email_unique" UNIQUE("enrichment_id","email");--> statement-breakpoint
ALTER TABLE "enrichment_facebook" ADD CONSTRAINT "enrichment_facebook_enrichment_id_url_unique" UNIQUE("enrichment_id","url");--> statement-breakpoint
ALTER TABLE "enrichment_instagram" ADD CONSTRAINT "enrichment_instagram_enrichment_id_url_unique" UNIQUE("enrichment_id","url");--> statement-breakpoint
ALTER TABLE "enrichment_linkedin" ADD CONSTRAINT "enrichment_linkedin_enrichment_id_url_unique" UNIQUE("enrichment_id","url");--> statement-breakpoint
ALTER TABLE "enrichment_phone" ADD CONSTRAINT "enrichment_phone_enrichment_id_phone_unique" UNIQUE("enrichment_id","phone");