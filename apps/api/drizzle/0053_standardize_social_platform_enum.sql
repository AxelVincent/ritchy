-- Drop dependencies that use the enum
ALTER TABLE contact_social_media DROP CONSTRAINT IF EXISTS contact_social_media_social_media_platform_check;

-- Update the column to use text temporarily
ALTER TABLE contact_social_media ALTER COLUMN social_media_platform TYPE text;

-- Standardize the values
UPDATE contact_social_media 
SET social_media_platform = CASE LOWER(social_media_platform)
    WHEN 'linkedin' THEN 'LINKEDIN'
    WHEN 'facebook' THEN 'FACEBOOK'
    WHEN 'instagram' THEN 'INSTAGRAM'
    ELSE social_media_platform
END;

-- Delete non-standard platforms
DELETE FROM contact_social_media 
WHERE social_media_platform NOT IN ('LINKEDIN', 'FACEBOOK', 'INSTAGRAM');

-- Create new enum with standardized values
DO $$ BEGIN
    CREATE TYPE social_platform_new AS ENUM (
        'LINKEDIN',
        'FACEBOOK',
        'INSTAGRAM'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop the old enum
DROP TYPE IF EXISTS social_platform;

-- Rename the new enum to the original name
ALTER TYPE social_platform_new RENAME TO social_platform;

-- Convert the column back to enum
ALTER TABLE contact_social_media 
    ALTER COLUMN social_media_platform TYPE social_platform 
    USING social_media_platform::social_platform; 