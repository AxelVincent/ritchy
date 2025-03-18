import 'dotenv/config'
import { logger } from '@ritchy/logger'
import { REDIS_KEYS } from '../lib/redis/keys'
import { redisClient } from '../lib/redis/redis'

async function flushRedisData() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command) {
    console.log(`
Redis Flush Utility

Usage:
  pnpm redis:flush <command> [options]

Commands:
  key <key>              - Delete a specific Redis key
  place <placeId>        - Delete cache for a specific place
  search <searchId>      - Delete all places from a specific search
  pattern <pattern>      - Delete all keys matching a pattern (e.g., "place:*")
  all                    - Flush all Redis data (USE WITH CAUTION!)

Examples:
  pnpm redis:flush key "place:ChIJN1t_tDeuEmsRUsoyG83frY4"
  pnpm redis:flush place "ChIJN1t_tDeuEmsRUsoyG83frY4"
  pnpm redis:flush search "550e8400-e29b-41d4-a716-446655440000"
  pnpm redis:flush pattern "place:*"
  pnpm redis:flush all
    `)
    process.exit(0)
  }

  try {
    switch (command) {
      case 'key': {
        const key = args[1]
        if (!key) {
          console.error('Error: Key is required')
          process.exit(1)
        }

        await redisClient.del(key)
        console.log(`Deleted key "${key}"`)
        break
      }

      case 'place': {
        const placeId = args[1]
        if (!placeId) {
          console.error('Error: Place ID is required')
          process.exit(1)
        }

        const key = REDIS_KEYS.place(placeId)
        await redisClient.del(key)
        console.log(`Deleted place "${placeId}"`)
        break
      }

      case 'search': {
        const searchId = args[1]
        if (!searchId) {
          console.error('Error: Search ID is required')
          process.exit(1)
        }

        // This requires a database query to find all places associated with the search
        console.log(`Finding places associated with search "${searchId}"...`)

        // Import necessary modules
        const { db } = await import('../db/db')
        const { listPlace } = await import('../db/schema')
        const { eq } = await import('drizzle-orm')

        // Get all places associated with this search
        const places = await db
          .select({ placeId: listPlace.placeId })
          .from(listPlace)
          .where(eq(listPlace.searchId, searchId))

        if (places.length === 0) {
          console.log(`No places found for search "${searchId}"`)
          break
        }

        console.log(`Found ${places.length} places to delete`)

        // Delete each place from Redis
        let deletedCount = 0
        for (const place of places) {
          const key = REDIS_KEYS.place(place.placeId)
          await redisClient.del(key)
          deletedCount++
        }

        console.log(
          `Deleted ${deletedCount} out of ${places.length} places for search "${searchId}"`,
        )
        break
      }

      case 'pattern': {
        const pattern = args[1]
        if (!pattern) {
          console.error('Error: Pattern is required')
          process.exit(1)
        }

        // Use the raw Redis client for scan operations
        let cursor = '0'
        let totalDeleted = 0

        do {
          // Scan for keys matching the pattern
          const [nextCursor, keys] = await redisClient.redis.scan(
            cursor,
            'MATCH',
            pattern,
            'COUNT',
            '100',
          )
          cursor = nextCursor

          if (keys.length > 0) {
            // Delete the found keys one by one
            for (const key of keys) {
              await redisClient.del(key)
              totalDeleted++
            }
            console.log(`Deleted ${keys.length} keys in this batch`)
          }
        } while (cursor !== '0')

        console.log(
          `Total keys deleted matching pattern "${pattern}": ${totalDeleted}`,
        )
        break
      }

      case 'all': {
        // Confirm before flushing all data
        const confirmation = args[1]
        if (confirmation !== '--confirm') {
          console.error('Warning: This will delete ALL data in Redis!')
          console.error('To confirm, run: pnpm redis:flush all --confirm')
          process.exit(1)
        }

        await redisClient.flush()
        console.log('All Redis data has been flushed')
        break
      }

      default:
        console.error(`Unknown command: ${command}`)
        process.exit(1)
    }
  } catch (error) {
    console.error('Error flushing Redis data:', error)
    process.exit(1)
  } finally {
    // Close Redis connection
    await redisClient.redis.quit()
  }
}

flushRedisData()
