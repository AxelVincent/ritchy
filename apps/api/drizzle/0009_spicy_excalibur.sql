CREATE TABLE IF NOT EXISTS "webhook_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'processed' NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_event_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_idempotency_key" ON "webhook_event" USING btree ("idempotency_key");