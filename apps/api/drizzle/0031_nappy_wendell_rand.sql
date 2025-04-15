DO $$
DECLARE
    search_record RECORD;
    earth_radius_meters CONSTANT float := 6371008.8;
    pi CONSTANT float := 3.14159265358979323846;
BEGIN
    -- First add the new column
    ALTER TABLE "search" ADD COLUMN "rectangle" jsonb;

    -- Then backfill data for all existing searches
    FOR search_record IN SELECT id, latitude::float, longitude::float, radius_in_meters FROM "search"
    LOOP
        WITH calculated_rectangle AS (
            SELECT json_build_object(
                'northEast', json_build_object(
                    'latitude', search_record.latitude::float + (search_record.radius_in_meters::float / earth_radius_meters) * (180.0 / pi),
                    'longitude', search_record.longitude::float + (search_record.radius_in_meters::float / earth_radius_meters) * (180.0 / pi) / cos(radians(search_record.latitude::float))
                ),
                'southWest', json_build_object(
                    'latitude', search_record.latitude::float - (search_record.radius_in_meters::float / earth_radius_meters) * (180.0 / pi),
                    'longitude', search_record.longitude::float - (search_record.radius_in_meters::float / earth_radius_meters) * (180.0 / pi) / cos(radians(search_record.latitude::float))
                )
            ) as rectangle
        )
        UPDATE "search"
        SET rectangle = calculated_rectangle.rectangle
        FROM calculated_rectangle
        WHERE id = search_record.id;
    END LOOP;

    -- Finally make the column required
    ALTER TABLE "search" ALTER COLUMN "rectangle" SET NOT NULL;
END $$;