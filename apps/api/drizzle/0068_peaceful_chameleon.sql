-- First, delete duplicate rows keeping only the latest created row for each user_place_id
DELETE FROM "status" 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_place_id) id
  FROM "status"
  ORDER BY user_place_id, created_at DESC
);

-- Now add the unique constraint
ALTER TABLE "status" ADD CONSTRAINT "status_user_place_id_unique" UNIQUE("user_place_id");