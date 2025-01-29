-- First, add temporary UUID columns
ALTER TABLE "list" ADD COLUMN "new_id" uuid;
ALTER TABLE "list_place" ADD COLUMN "new_id" uuid;
ALTER TABLE "list_place" ADD COLUMN "new_list_id" uuid;
ALTER TABLE "note" ADD COLUMN "new_id" uuid;

-- Populate new UUID columns with generated values
UPDATE "list" SET "new_id" = gen_random_uuid();
UPDATE "list_place" SET "new_id" = gen_random_uuid();
UPDATE "note" SET "new_id" = gen_random_uuid();

-- Create a mapping for list IDs and update list_place references
UPDATE "list_place" lp 
SET "new_list_id" = l."new_id"
FROM "list" l 
WHERE lp."list_id" = l."id";

-- Find and drop the actual foreign key constraint name
DO $$ 
BEGIN
    EXECUTE (
        SELECT 'ALTER TABLE "list_place" DROP CONSTRAINT "' || conname || '"'
        FROM pg_constraint
        WHERE conrelid = 'list_place'::regclass
        AND contype = 'f'
        AND conname LIKE '%list_id%'
    );
END $$;

-- Drop primary keys
ALTER TABLE "list" DROP CONSTRAINT "list_pkey";
ALTER TABLE "list_place" DROP CONSTRAINT "list_place_pkey";
ALTER TABLE "note" DROP CONSTRAINT "note_pkey";

-- Drop old columns and rename new ones
ALTER TABLE "list" DROP COLUMN "id";
ALTER TABLE "list" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "list" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "list" ADD PRIMARY KEY ("id");

ALTER TABLE "list_place" DROP COLUMN "id";
ALTER TABLE "list_place" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "list_place" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "list_place" ADD PRIMARY KEY ("id");

ALTER TABLE "list_place" DROP COLUMN "list_id";
ALTER TABLE "list_place" RENAME COLUMN "new_list_id" TO "list_id";
ALTER TABLE "list_place" ALTER COLUMN "list_id" SET NOT NULL;

ALTER TABLE "note" DROP COLUMN "id";
ALTER TABLE "note" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "note" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "note" ADD PRIMARY KEY ("id");

-- Re-add foreign key constraint with a specific name
ALTER TABLE "list_place" ADD CONSTRAINT "list_place_list_id_fk" 
  FOREIGN KEY ("list_id") REFERENCES "list"("id");

-- Set default values for future inserts
ALTER TABLE "list" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "list_place" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "note" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();