import 'dotenv/config'
import { logger } from '@ritchy/logger'
import { Command } from 'commander'
import { eq } from 'drizzle-orm'
import { publicDb } from '../db/db'
import { place } from '../db/schema'
import type { PreferredPlace } from '../external/google_maps/types'
import { REDIS_KEYS } from '../internal/redis/keys'
import { createRedisClient } from '../internal/redis/redis'

const program = new Command()

program.name('data-migration').description('Data migration script')

program
  .command('fill-place-table')
  .description('Fill place table with data from Redis')
  .option('-r, --run', 'Run migration', false)
  .option('-b, --batch-size <size>', 'Batch size for processing', '100')
  .action(async (options) => {
    await fillPlaceTable(options.run, Number.parseInt(options.batchSize))
  })

const fillPlaceTable = async (run: boolean, batchSize = 100) => {
  const redisPublicClient = createRedisClient({ isPublic: true })
  const isDryRun = !run
  const startTime = Date.now()
  let totalCount = 0
  let processedCount = 0
  let skippedCount = 0
  let errorCount = 0
  let offset = 0
  let hasMore = true

  logger.info({
    msg: `Filling place table from Redis ${isDryRun ? '(dry run)' : ''}`,
    event: 'fill_place_table',
    metadata: { run, batchSize },
  })

  // Process places in batches from PostgreSQL
  while (hasMore) {
    const places = await publicDb
      .select()
      .from(place)
      .limit(batchSize)
      .offset(offset)

    totalCount += places.length
    hasMore = places.length === batchSize
    offset += batchSize

    logger.info({
      msg: `Processing batch of ${places.length} places ${isDryRun ? '(dry run)' : ''}`,
      event: 'fill_place_table',
      metadata: {
        batchSize: places.length,
        offset,
        totalCount,
        hasMore,
        run,
      },
    })

    for (const dbPlace of places) {
      try {
        const key = REDIS_KEYS.place(dbPlace.sourceId)
        const cachedPlace = await redisPublicClient.get<PreferredPlace>(key)

        if (!cachedPlace) {
          logger.debug({
            msg: `No Redis data found for place: ${dbPlace.sourceId}`,
            event: 'fill_place_table',
            metadata: {
              placeId: dbPlace.id,
              sourceId: dbPlace.sourceId,
              run,
            },
          })
          skippedCount++
          continue
        }

        logger.info({
          msg: `Found Redis data for place: ${dbPlace.sourceId}`,
          event: 'fill_place_table',
          metadata: {
            placeId: dbPlace.id,
            sourceId: dbPlace.sourceId,
            hasData: !!cachedPlace,
            run,
          },
        })

        if (isDryRun) {
          logger.info({
            msg: `Would update place: ${dbPlace.sourceId} ${isDryRun ? '(dry run)' : ''}`,
            event: 'fill_place_table',
            metadata: {
              placeId: dbPlace.id,
              sourceId: dbPlace.sourceId,
              run,
            },
          })
          processedCount++
          continue
        }

        await publicDb
          .update(place)
          .set({
            sourceUrl: cachedPlace.data.googleMapsUri || null,
            website: cachedPlace.data.websiteUri || null,
            name: cachedPlace.data.displayName?.text || null,
            location: cachedPlace.data.location || {
              latitude: 0,
              longitude: 0,
            },
            types: cachedPlace.data.types || [],
            primaryType: cachedPlace.data.primaryType || null,
            priceLevel: cachedPlace.data.priceLevel,
            priceRange: cachedPlace.data.priceRange,
            rating: cachedPlace.data.rating || null,
            ratingCount: cachedPlace.data.userRatingCount || null,
            phone: cachedPlace.data.internationalPhoneNumber || null,
            utcOffsetMinutes: cachedPlace.data.utcOffsetMinutes || null,
            openingHours: cachedPlace.data.regularOpeningHours || null,
            formattedAddress: cachedPlace.data.formattedAddress || '',
            shortFormattedAddress: cachedPlace.data.shortFormattedAddress || '',
            country:
              cachedPlace.data.addressComponents?.find((component) =>
                component.types?.includes('country'),
              )?.longText || '',
            locality:
              cachedPlace.data.addressComponents?.find((component) =>
                component.types?.includes('locality'),
              )?.longText || '',
            sublocality:
              cachedPlace.data.addressComponents?.find((component) =>
                component.types?.includes('sublocality'),
              )?.longText || '',
            postalCode:
              cachedPlace.data.addressComponents?.find((component) =>
                component.types?.includes('postal_code'),
              )?.longText || '',
            postalCodeSuffix:
              cachedPlace.data.addressComponents?.find((component) =>
                component.types?.includes('postal_code_suffix'),
              )?.longText || '',
            plusCode:
              cachedPlace.data.addressComponents?.find((component) =>
                component.types?.includes('plus_code'),
              )?.longText || '',
            street:
              cachedPlace.data.addressComponents?.find((component) =>
                component.types?.includes('route'),
              )?.longText || '',
            streetNumber:
              cachedPlace.data.addressComponents?.find((component) =>
                component.types?.includes('street_number'),
              )?.longText || '',
            neighborhood:
              cachedPlace.data.addressComponents?.find((component) =>
                component.types?.includes('neighborhood'),
              )?.longText || '',
            administrativeAreaLevel1:
              cachedPlace.data.addressComponents?.find((component) =>
                component.types?.includes('administrative_area_level_1'),
              )?.longText || '',
            administrativeAreaLevel2:
              cachedPlace.data.addressComponents?.find((component) =>
                component.types?.includes('administrative_area_level_2'),
              )?.longText || '',
            administrativeAreaLevel3:
              cachedPlace.data.addressComponents?.find((component) =>
                component.types?.includes('administrative_area_level_3'),
              )?.longText || '',
            updatedAt: new Date(),
          })
          .where(eq(place.id, dbPlace.id))

        logger.info({
          msg: `Successfully updated place: ${dbPlace.sourceId}`,
          event: 'fill_place_table',
          metadata: {
            placeId: dbPlace.id,
            sourceId: dbPlace.sourceId,
            run,
          },
        })

        processedCount++
      } catch (error) {
        logger.error({
          msg: `Error processing place: ${dbPlace.sourceId}`,
          event: 'fill_place_table',
          metadata: {
            placeId: dbPlace.id,
            sourceId: dbPlace.sourceId,
            error,
            run,
          },
        })
        errorCount++
      }
    }
  }

  const endTime = Date.now()
  logger.info({
    msg: `Completed filling place table ${isDryRun ? '(dry run)' : ''}`,
    event: 'fill_place_table',
    metadata: {
      duration: endTime - startTime,
      totalCount,
      processedCount,
      skippedCount,
      errorCount,
      run,
    },
  })
}

program.parse()
