ALTER TABLE "search" ALTER COLUMN "latitude" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "search" ALTER COLUMN "longitude" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "search" ALTER COLUMN "radius_in_meters" DROP NOT NULL;