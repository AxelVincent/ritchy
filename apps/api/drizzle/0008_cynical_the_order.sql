-- Drop the existing unique index if it exists
DROP INDEX IF EXISTS "uniq_list_place";

-- Recreate the unique index with the correct UUID column types
CREATE UNIQUE INDEX "uniq_list_place" ON "list_place" ("list_id", "place_id"); 