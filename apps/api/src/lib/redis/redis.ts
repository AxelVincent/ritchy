import { logger } from '@ritchy/logger'
import { Redis } from 'ioredis'
import { REDIS_CONFIG } from '../../config/redis'

type CacheOptions = {
  /** TTL in seconds */
  ttl?: number
  /** Optional prefix for the key */
  prefix?: string
}

const DEFAULT_TTL = 90 * 24 * 60 * 60 // 90 days in seconds

/**
 * Creates a Redis client with caching utilities
 *
 * @example
 * ```ts
 * // Basic usage
 * const client = createRedisClient()
 *
 * // Cache data
 * await client.set('user:123', { name: 'John', age: 30 })
 *
 * // Retrieve cached data
 * const user = await client.get<User>('user:123')
 *
 * // Cache with options
 * await client.set('post:456', postData, {
 *   ttl: 3600, // 1 hour
 *   prefix: 'cache'  // Results in key: cache:post:456
 * })
 *
 * // Delete cached data
 * await client.del('user:123')
 *
 * // Clear all cache
 * await client.flush()
 * ```
 *
 * @param options - Optional configuration options
 * @returns Object containing Redis client and utility methods
 */
const createRedisClient = (options?: { usePublicUrl?: boolean }) => {
  let URL: string

  // Use public URL if specified, otherwise use config
  if (options?.usePublicUrl && REDIS_CONFIG.PUBLIC_URL) {
    URL = REDIS_CONFIG.PUBLIC_URL
    logger.info({
      msg: 'Using REDIS_PUBLIC_URL for connection',
      event: 'redis_init',
    })
  } else {
    // Use the existing configuration
    URL = `redis://${REDIS_CONFIG.USER}:${REDIS_CONFIG.PASSWORD}@${REDIS_CONFIG.HOST}:${REDIS_CONFIG.PORT}?family=0`
  }

  const redis = new Redis(URL, {
    retryStrategy(times) {
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
   * Retrieves cached data by key
   * @param key - Cache key
   * @param prefix - Optional prefix for the key
   * @returns Parsed data or null if not found
   */
  const get = async <T>(key: string, prefix?: string): Promise<T | null> => {
    const fullKey = prefix ? `${prefix}:${key}` : key
    const data = await redis.get(fullKey)
    if (!data) return null
    try {
      return JSON.parse(data) as T
    } catch (error) {
      logger.error({
        msg: 'Failed to parse cached data',
        event: 'redis_parse_error',
        metadata: { error, key: fullKey },
      })
      return null
    }
  }

  /**
   * Caches data with optional TTL and prefix
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
      const serializedValue = JSON.stringify(value)
      await redis.set(fullKey, serializedValue, 'EX', ttl)
    } catch (error) {
      logger.error({
        msg: 'Failed to cache data',
        event: 'redis_set_error',
        metadata: { error, key: fullKey },
      })
    }
  }

  /**
   * Deletes cached data by key
   * @param key - Cache key
   * @param prefix - Optional prefix for the key
   */
  const del = async (key: string, prefix?: string): Promise<void> => {
    const fullKey = prefix ? `${prefix}:${key}` : key
    await redis.del(fullKey)
  }

  /**
   * Clears all cached data
   */
  const flush = async (): Promise<void> => {
    await redis.flushall()
  }

  return {
    redis, // Expose raw client for advanced operations
    get,
    set,
    del,
    flush,
  }
}

// Create singleton instance with default configuration
export const redisClient = createRedisClient()

// Export the factory function for scripts that need a public URL connection
export { createRedisClient }
