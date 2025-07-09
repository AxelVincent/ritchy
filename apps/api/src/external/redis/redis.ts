import { logger } from '@ritchy/logger'
import { Redis } from 'ioredis'
import { REDIS_CONFIG } from '../../config/redis'

type CacheOptions = {
  /** TTL in seconds */
  ttl?: number
  /** Optional prefix for the key */
  prefix?: string
}

type CacheData<T> = {
  data: T
  is_deleted?: boolean
  created_at: string
  updated_at: string
  expires_at?: string
}

const DEFAULT_TTL = 90 * 24 * 60 * 60 // 90 days in seconds
const DELETED_TTL = 30 * 24 * 60 * 60 // 30 days for deleted items

/**
 * Creates a Redis client with JSON module support for caching utilities
 * Simplified to make only one Redis call per operation
 *
 * @example
 * ```ts
 * // Basic usage
 * const client = createRedisClient()
 *
 * // Cache data using JSON module
 * await client.set('user:123', { name: 'John', age: 30 })
 *
 * // Retrieve cached data with metadata
 * const result = await client.get<User>('user:123')
 * if (result) {
 *   console.log(result.data) // The actual data
 *   console.log(result.is_deleted) // Deletion status
 *   console.log(result.updated_at) // Last update time
 * }
 * ```
 *
 * @returns Object containing Redis client and utility methods
 */
const createRedisClient = () => {
  // https://docs.railway.com/guides/private-networking#ioredis
  const URL = `redis://${REDIS_CONFIG.USER}:${REDIS_CONFIG.PASSWORD}@${REDIS_CONFIG.HOST}:${REDIS_CONFIG.PORT}?family=0`
  const redis = new Redis(URL, {
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
  })

  redis.on('error', (error) => {
    logger.error({
      msg: 'Redis connection error',
      event: 'redis_error',
      metadata: { error },
    })
  })

  redis.on('connect', () => {
    logger.info({ msg: 'Redis connected', event: 'redis_connect' })
  })

  redis.on('ready', () => {
    logger.info({ msg: 'Redis ready', event: 'redis_ready' })
  })

  /**
   * Retrieves cached data with metadata by key using JSON module
   * @param key - Cache key
   * @param prefix - Optional prefix for the key
   * @returns Cache data with metadata or null if not found
   */
  const get = async <T>(
    key: string,
    prefix?: string,
  ): Promise<CacheData<T> | null> => {
    const fullKey = prefix ? `${prefix}:${key}` : key

    try {
      // Use JSON.GET command from Redis JSON module
      const data = await redis.call('JSON.GET', fullKey)
      if (typeof data !== 'string' && data !== null) {
        throw new Error('Unexpected Redis JSON.GET response type')
      }
      if (!data) return null

      const parsedData = JSON.parse(data) as CacheData<T>

      // Check if data is marked as deleted
      if (parsedData.is_deleted) {
        logger.info({
          msg: 'Retrieved deleted data from cache',
          event: 'redis_deleted_data_retrieved',
          metadata: { key: fullKey },
        })
      }

      return parsedData
    } catch (error) {
      // If JSON.GET fails (e.g., key doesn't exist or is not JSON), return null
      if (error instanceof Error && error.message.includes('key')) {
        return null
      }

      logger.error({
        msg: 'Failed to retrieve cached data using JSON module',
        event: 'redis_json_get_error',
        metadata: { error, key: fullKey },
      })
      return null
    }
  }

  /**
   * Caches data with optional TTL and prefix using JSON module
   * @param key - Cache key
   * @param value - Data to cache
   * @param options - Cache options (TTL in seconds, key prefix)
   */
  const set = async <T>(
    key: string,
    value: T,
    options: CacheOptions = {},
  ): Promise<void> => {
    const { ttl = DEFAULT_TTL, prefix } = options
    const fullKey = prefix ? `${prefix}:${key}` : key

    try {
      const now = new Date().toISOString()
      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString()

      // Check if key already exists to preserve created_at
      const existingData = await get<T>(key, prefix)

      const cacheData: CacheData<T> = {
        data: value,
        created_at: existingData?.created_at || now,
        updated_at: now,
        expires_at: expiresAt,
        // Preserve is_deleted flag if it exists and we're not explicitly updating
        ...(existingData?.is_deleted && { is_deleted: false }),
      }

      // Use JSON.SET command from Redis JSON module
      await redis.call('JSON.SET', fullKey, '$', JSON.stringify(cacheData))

      // Set TTL using EXPIRE command
      await redis.expire(fullKey, ttl)

      logger.debug({
        msg: 'Data cached successfully',
        event: 'redis_data_cached',
        metadata: { key: fullKey, ttl },
      })
    } catch (error) {
      logger.error({
        msg: 'Failed to cache data using JSON module',
        event: 'redis_json_set_error',
        metadata: { error, key: fullKey },
      })
    }
  }

  /**
   * Marks data as deleted instead of removing it
   * @param key - Cache key
   * @param prefix - Optional prefix for the key
   */
  const markAsDeleted = async (key: string, prefix?: string): Promise<void> => {
    const fullKey = prefix ? `${prefix}:${key}` : key

    try {
      const existingData = await get(key, prefix)
      if (!existingData) {
        logger.warn({
          msg: 'Attempted to mark non-existent key as deleted',
          event: 'redis_mark_deleted_not_found',
          metadata: { key: fullKey },
        })
        return
      }

      const updatedData: CacheData<typeof existingData.data> = {
        ...existingData,
        is_deleted: true,
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + DELETED_TTL * 1000).toISOString(),
      }

      await redis.call('JSON.SET', fullKey, '$', JSON.stringify(updatedData))
      await redis.expire(fullKey, DELETED_TTL)

      logger.info({
        msg: 'Data marked as deleted',
        event: 'redis_data_marked_deleted',
        metadata: { key: fullKey, ttl: DELETED_TTL },
      })
    } catch (error) {
      logger.error({
        msg: 'Failed to mark data as deleted',
        event: 'redis_mark_deleted_error',
        metadata: { error, key: fullKey },
      })
    }
  }

  /**
   * Clears all cached data (use with caution - this permanently removes data)
   * @param prefix - Optional prefix to clear only specific keys
   */
  const flush = async (prefix?: string): Promise<void> => {
    if (prefix) {
      // Clear only keys with specific prefix
      const keys = await redis.keys(`${prefix}:*`)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } else {
      await redis.flushall()
    }
  }

  /**
   * Check existence of multiple keys using Redis pipeline with EXISTS
   * @param placeIds - Array of place IDs to check
   * @returns Object mapping place ID to existence boolean
   */
  const checkPlaceKeysExistence = async (
    placeIds: string[],
  ): Promise<Record<string, boolean>> => {
    if (placeIds.length === 0) {
      return {}
    }

    try {
      logger.debug({
        msg: 'Starting key existence check',
        event: 'redis_key_existence_debug',
        metadata: {
          placeIds: placeIds.slice(0, 5),
          totalCount: placeIds.length,
        },
      })

      // Create pipeline for batch EXISTS commands
      const pipeline = redis.pipeline()

      // Add EXISTS command for each place ID
      for (const id of placeIds) {
        const key = `place:${id}`
        pipeline.exists(key)
        logger.debug({
          msg: 'Added EXISTS command to pipeline',
          event: 'redis_pipeline_command_added',
          metadata: { key },
        })
      }

      logger.debug({
        msg: 'Pipeline created, executing commands',
        event: 'redis_pipeline_executing',
        metadata: { commandCount: placeIds.length },
      })

      // Execute all commands in one batch
      const results = await pipeline.exec()

      logger.debug({
        msg: 'Pipeline execution completed',
        event: 'redis_pipeline_executed',
        metadata: {
          resultsLength: results?.length || 0,
          resultsPreview: results?.slice(0, 3) || [],
        },
      })

      // Handle empty results
      if (!results || results.length === 0) {
        logger.error({
          msg: 'Pipeline returned empty results',
          event: 'redis_pipeline_empty_results',
          metadata: { placeIds: placeIds.slice(0, 5) },
        })

        // Fallback to individual EXISTS commands
        const existenceMap: Record<string, boolean> = {}
        for (const placeId of placeIds) {
          try {
            const exists = await redis.exists(`place:${placeId}`)
            existenceMap[placeId] = exists === 1
          } catch (error) {
            logger.error({
              msg: 'Individual EXISTS command failed',
              event: 'redis_exists_individual_error',
              metadata: { placeId, error },
            })
            existenceMap[placeId] = false
          }
        }
        return existenceMap
      }

      // Convert pipeline results to key-value mapping
      const existenceMap: Record<string, boolean> = {}

      results.forEach(([error, exists], index) => {
        const placeId = placeIds[index]
        if (error) {
          logger.warn({
            msg: 'Error checking key existence',
            event: 'redis_key_existence_error_single',
            metadata: { placeId, error },
          })
          existenceMap[placeId] = false
        } else {
          existenceMap[placeId] = exists === 1
        }
      })

      const existingCount = Object.values(existenceMap).filter(Boolean).length

      logger.info({
        msg: 'Key existence check completed',
        event: 'redis_key_existence_check',
        metadata: {
          requestedKeys: placeIds.length,
          existingKeys: existingCount,
          cacheHitRate: `${((existingCount / placeIds.length) * 100).toFixed(1)}%`,
        },
      })

      return existenceMap
    } catch (error) {
      logger.error({
        msg: 'Key existence check failed',
        event: 'redis_key_existence_error',
        metadata: {
          error,
          placeIds: placeIds.slice(0, 10),
          totalIds: placeIds.length,
        },
      })

      throw error
    }
  }

  return {
    redis, // Expose raw client for advanced operations
    get,
    set,
    markAsDeleted,
    flush,
    checkPlaceKeysExistence,
  }
}

// Create singleton instance
export const redisClient = createRedisClient()
