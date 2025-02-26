import 'dotenv/config'
import { logger } from '@ritchy/logger'
import { createRedisClient } from '../lib/redis/redis'

/**
 * Script to clear Redis cache for place and search keys
 *
 * Usage:
 * - Clear all: pnpm tsx scripts/clear-cache.ts
 * - Clear specific place: pnpm tsx scripts/clear-cache.ts place placeId123
 * - Clear specific search: pnpm tsx scripts/clear-cache.ts search searchId123
 */
async function clearCache() {
  // Create a Redis client using the public URL
  const { redis } = createRedisClient({ usePublicUrl: true })

  const args = process.argv.slice(2)
  const [keyType, id] = args

  try {
    if (!keyType || keyType === 'all') {
      // Clear all place and search keys
      const placeKeys = await redis.keys('place:*')
      const searchKeys = await redis.keys('search:*')

      if (placeKeys.length > 0) {
        await Promise.all(placeKeys.map((key) => redis.del(key)))
        logger.info({
          msg: `Cleared ${placeKeys.length} place cache entries`,
          event: 'cache_clear',
          metadata: { type: 'place', count: placeKeys.length },
        })
      } else {
        logger.info({
          msg: 'No place cache entries found',
          event: 'cache_clear',
          metadata: { type: 'place', count: 0 },
        })
      }

      if (searchKeys.length > 0) {
        await Promise.all(searchKeys.map((key) => redis.del(key)))
        logger.info({
          msg: `Cleared ${searchKeys.length} search cache entries`,
          event: 'cache_clear',
          metadata: { type: 'search', count: searchKeys.length },
        })
      } else {
        logger.info({
          msg: 'No search cache entries found',
          event: 'cache_clear',
          metadata: { type: 'search', count: 0 },
        })
      }
    } else if (keyType === 'place' && id) {
      // Clear specific place key
      const key = `place:${id}`
      const deleted = await redis.del(key)
      logger.info({
        msg: deleted
          ? `Cleared place cache for ID: ${id}`
          : `No cache found for place ID: ${id}`,
        event: 'cache_clear',
        metadata: { type: 'place', id, success: !!deleted },
      })
    } else if (keyType === 'search' && id) {
      // Clear specific search key
      const key = `search:${id}`
      const deleted = await redis.del(key)
      logger.info({
        msg: deleted
          ? `Cleared search cache for ID: ${id}`
          : `No cache found for search ID: ${id}`,
        event: 'cache_clear',
        metadata: { type: 'search', id, success: !!deleted },
      })
    } else {
      logger.error({
        msg: 'Invalid arguments. Usage: clear-cache.ts [all|place|search] [id]',
        event: 'cache_clear_error',
        metadata: { args },
      })
    }
  } catch (error) {
    logger.error({
      msg: 'Error clearing cache',
      event: 'cache_clear_error',
      metadata: { error },
    })
  } finally {
    // Close the Redis connection when done
    await redis.quit()
    logger.info({ msg: 'Redis connection closed', event: 'redis_disconnect' })
  }
}

clearCache().catch((error) => {
  logger.error({
    msg: 'Unhandled error in cache clearing script',
    event: 'cache_clear_fatal',
    metadata: { error },
  })
  process.exit(1)
})
