-- Drop dependencies that use the enum
ALTER TABLE contact_social_media DROP CONSTRAINT IF EXISTS contact_social_media_social_media_platform_check;

-- Create a new temporary enum with reduced values
DO $$ BEGIN
    CREATE TYPE social_platform_new AS ENUM (
        'FACEBOOK',
        'LINKEDIN',
        'INSTAGRAM'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update the column to use text temporarily
ALTER TABLE contact_social_media ALTER COLUMN social_media_platform TYPE text;

-- Delete records with platforms we're removing
DELETE FROM contact_social_media 
WHERE social_media_platform NOT IN ('FACEBOOK', 'LINKEDIN', 'INSTAGRAM');

-- Drop the old enum
DROP TYPE IF EXISTS social_platform;

-- Rename the new enum to the original name
ALTER TYPE social_platform_new RENAME TO social_platform;

-- Convert the column back to enum
ALTER TABLE contact_social_media 
    ALTER COLUMN social_media_platform TYPE social_platform 
    USING social_media_platform::social_platform;