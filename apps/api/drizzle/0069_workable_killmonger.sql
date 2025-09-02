-- Step 1: Create a temporary table to track which place to keep for each source_id
CREATE TEMP TABLE place_keep AS
SELECT DISTINCT ON (source_id) 
  id,
  source_id,
  created_at
FROM "place"
ORDER BY source_id, created_at ASC;

-- Step 2: Create a mapping table for place_id updates
CREATE TEMP TABLE place_id_mapping AS
SELECT 
  p.id as old_place_id,
  pk.id as new_place_id,
  p.source_id
FROM "place" p
JOIN place_keep pk ON p.source_id = pk.source_id
WHERE p.id != pk.id;

-- Step 3: Handle duplicate user_place records that would be created after the update
-- First, identify user_place records that would become duplicates after the update
CREATE TEMP TABLE duplicate_user_places AS
SELECT 
  up.id,
  up.user_id,
  COALESCE(pim.new_place_id, up.place_id) as new_place_id,
  up.created_at
FROM "user_place" up
LEFT JOIN place_id_mapping pim ON up.place_id = pim.old_place_id
WHERE EXISTS (
  SELECT 1 
  FROM "user_place" up2
  LEFT JOIN place_id_mapping pim2 ON up2.place_id = pim2.old_place_id
  WHERE up2.user_id = up.user_id 
    AND up2.id != up.id
    AND COALESCE(pim2.new_place_id, up2.place_id) = COALESCE(pim.new_place_id, up.place_id)
);

-- Step 4: Delete duplicate user_place records, keeping the oldest one per (user_id, new_place_id)
DELETE FROM "user_place" 
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, new_place_id 
             ORDER BY created_at ASC
           ) as rn
    FROM duplicate_user_places
  ) ranked
  WHERE rn > 1
);

-- Step 5: Update user_place references to point to the kept place
UPDATE "user_place" 
SET place_id = pim.new_place_id
FROM place_id_mapping pim
WHERE "user_place".place_id = pim.old_place_id;

-- Step 6: Delete duplicate places (keeping only the oldest one per source_id)
DELETE FROM "place" 
WHERE id NOT IN (
  SELECT id FROM place_keep
);

-- Step 7: Delete places that are not referenced by any user_place (orphaned)
DELETE FROM "place" 
WHERE id NOT IN (
  SELECT DISTINCT place_id 
  FROM "user_place" 
  WHERE place_id IS NOT NULL
);

-- Step 8: Create unique index on source_id
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_place_source_id" ON "place" USING btree ("source_id");

-- Clean up temporary tables
DROP TABLE place_keep;
DROP TABLE place_id_mapping;
DROP TABLE duplicate_user_places;