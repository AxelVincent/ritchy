-- Add limit column (nullable first for existing data)
ALTER TABLE "search" ADD COLUMN "limit" integer;

-- Backfill existing searches based on model
UPDATE "search" SET "limit" = CASE "model"
  WHEN 'BASIC' THEN 60
  WHEN 'ENHANCED' THEN 240
  WHEN 'ADVANCED' THEN 960
  WHEN 'EXPERT' THEN 3840
  ELSE 60
END;

-- Make column NOT NULL after backfill
ALTER TABLE "search" ALTER COLUMN "limit" SET NOT NULL;
