CREATE TABLE IF NOT EXISTS "custom_list" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"emoji" text NOT NULL,
	"user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "custom_list_place" (
	"id" serial PRIMARY KEY NOT NULL,
	"custom_list_id" integer NOT NULL,
	"place_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_list_place" ADD CONSTRAINT "custom_list_place_custom_list_id_custom_list_id_fk" FOREIGN KEY ("custom_list_id") REFERENCES "public"."custom_list"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
