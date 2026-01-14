-- First add the encrypted_key column as nullable
ALTER TABLE "api_key" ADD COLUMN "encrypted_key" text;

-- Delete only keys that don't have encrypted_key value (legacy keys)
DELETE FROM "api_key" WHERE "encrypted_key" IS NULL;

-- Now make the column NOT NULL
ALTER TABLE "api_key" ALTER COLUMN "encrypted_key" SET NOT NULL;