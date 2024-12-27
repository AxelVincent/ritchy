CREATE TABLE IF NOT EXISTS "list" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"emoji" text NOT NULL,
	"user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "list_place" (
	"id" serial PRIMARY KEY NOT NULL,
	"list_id" integer NOT NULL,
	"place_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "custom_list" CASCADE;--> statement-breakpoint
DROP TABLE "custom_list_place" CASCADE;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "list_place" ADD CONSTRAINT "list_place_list_id_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."list"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
