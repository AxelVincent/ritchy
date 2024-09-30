CREATE TABLE IF NOT EXISTS "lead" (
	"id" serial PRIMARY KEY NOT NULL,
	"query_param_id" integer NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"phone" text,
	"website" text,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lead_query_param_id_index" (
	"query_param_id" integer NOT NULL,
	"lead_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "query_param" (
	"id" serial PRIMARY KEY NOT NULL,
	"research_query" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"zoom" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "user";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lead" ADD CONSTRAINT "lead_query_param_id_query_param_id_fk" FOREIGN KEY ("query_param_id") REFERENCES "public"."query_param"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lead_query_param_id_index" ADD CONSTRAINT "lead_query_param_id_index_query_param_id_query_param_id_fk" FOREIGN KEY ("query_param_id") REFERENCES "public"."query_param"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lead_query_param_id_index" ADD CONSTRAINT "lead_query_param_id_index_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
