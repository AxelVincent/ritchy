ALTER TABLE "credits" ADD CONSTRAINT "enrichment_credit_check" CHECK (enrichment >= 0);--> statement-breakpoint
ALTER TABLE "credits" ADD CONSTRAINT "search_credit_check" CHECK (search >= 0);