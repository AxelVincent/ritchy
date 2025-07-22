import 'dotenv/config'
import { publicDb } from '../db/db'
import {
  place,
  search,
  searchPlace,
  userPlace as userPlaceTable
} from '../db/schema'
import { REDIS_KEYS } from '../external/redis/keys'
import { createRedisClient } from '../external/redis/redis'
import { logger } from '@ritchy/logger'
import { Command } from 'commander'

const program = new Command()

program.name('data-migration').description('Data migration script')

program
  .command('fill-search-place-table')
  .description('Fill search_place table')
  .option('-r, --run', 'Run migration', false)
  .action(async (options) => {
    await fillSearchPlaceTable(options.run)
  })

const fillSearchPlaceTable = async (run: boolean) => {
  const redisPublicClient = createRedisClient({ isPublic: true })
  const isDryRun = !run
  const startTime = Date.now()
  let totalCount = 0
  logger.info({
    msg: `Filling search_place table ${isDryRun ? '(dry run)' : ''}`,
    event: 'fill_search_place_table',
    metadata: { run }
  })
  const limit = 100
  let offset = 0
  let hasMore = true
  while (hasMore) {
    const searchResults = await publicDb
      .select()
      .from(search)
      .limit(limit)
      .offset(offset)
    totalCount += searchResults.length
    hasMore = searchResults.length === limit
    offset += limit
    logger.info({
      msg: `Filling search_place table ${isDryRun ? '(dry run)' : ''}`,
      event: 'fill_search_place_table',
      metadata: { offset, limit, totalCount, hasMore, run }
    })

    for (const searchResult of searchResults) {
      const key = REDIS_KEYS.search(searchResult.id)
      const places = await redisPublicClient.get<string[]>(key)
      logger.info({
        msg: `Fetched places from redis ${isDryRun ? '(dry run)' : ''}`,
        event: 'fill_search_place_table',
        metadata: { searchId: searchResult.id, places: places?.data }
      })
      if (places) {
        if (isDryRun) {
          logger.info({
            msg: `Skipping place migration ${isDryRun ? '(dry run)' : ''}`,
            event: 'fill_search_place_table',
            metadata: { searchId: searchResult.id, places: places.data }
          })
        } else {
          logger.info({
            msg: `Migrating places ${isDryRun ? '(dry run)' : ''}`,
            event: 'fill_search_place_table',
            metadata: { searchId: searchResult.id }
          })
          for (const redisPlace of places.data) {
            const [placeResult] = await publicDb
              .insert(place)
              .values({
                source: 'google',
                sourceId: redisPlace
              })
              .onConflictDoUpdate({
                target: place.sourceId,
                set: {}
              })
              .returning({ id: place.id })

            const [userPlace] = await publicDb
              .insert(userPlaceTable)
              .values({
                userId: searchResult.userId,
                placeId: placeResult.id
              })
              .returning({ id: userPlaceTable.id })

            await publicDb.insert(searchPlace).values({
              userPlaceId: userPlace.id,
              searchId: searchResult.id
            })
          }
        }
      }
    }
  }
  const endTime = Date.now()
  logger.info({
    msg: `Filled search_place table ${isDryRun ? '(dry run)' : ''}`,
    event: 'fill_search_place_table',
    metadata: { duration: endTime - startTime, totalCount, run }
  })
}

program.parse()
