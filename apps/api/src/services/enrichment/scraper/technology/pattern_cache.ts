import { logger } from '@ritchy/logger'
import { gt } from 'drizzle-orm'
import { db } from '../../../../db/db'
import { technologyPattern } from '../../../../db/schema/enrichment'
import { redisClient } from '../../../../internal/redis/redis'
import { matchPatternsInMemory as matchPatternsInMemoryUtil } from './pattern_matcher_utils'

// Cache configuration
const CACHE_KEY = 'tech_detection:patterns'
const CACHE_TTL = 5 * 60 // 5 minutes in seconds

export type CachedPattern = {
  id: string
  technology: string
  category: string
  pattern: string
  patternType: string
  confirmedCount: number
}

/**
 * Fetches active patterns with Redis caching
 * Falls back to DB if cache miss or error
 */
export const getActivePatterns = async (): Promise<CachedPattern[]> => {
  try {
    // Try cache first
    const cached = await redisClient.get<CachedPattern[]>(CACHE_KEY)

    if (cached?.data) {
      logger.debug({
        msg: '[Pattern Cache] Cache HIT',
        event: 'pattern_cache_hit',
        metadata: { count: cached.data.length },
      })
      return cached.data
    }

    // Cache miss - fetch from DB
    logger.debug({
      msg: '[Pattern Cache] Cache MISS - fetching from DB',
      event: 'pattern_cache_miss',
    })

    const patterns = await db
      .select({
        id: technologyPattern.id,
        technology: technologyPattern.technology,
        category: technologyPattern.category,
        pattern: technologyPattern.pattern,
        patternType: technologyPattern.patternType,
        confirmedCount: technologyPattern.confirmedCount,
      })
      .from(technologyPattern)
      .where(gt(technologyPattern.confirmedCount, 0))

    // Store in cache
    await redisClient.set(CACHE_KEY, patterns, { ttl: CACHE_TTL })

    logger.info({
      msg: '[Pattern Cache] Loaded and cached patterns',
      event: 'pattern_cache_loaded',
      metadata: { count: patterns.length },
    })

    return patterns
  } catch (error) {
    logger.error({
      msg: '[Pattern Cache] Error accessing cache, falling back to direct DB',
      event: 'pattern_cache_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })

    // Fallback to direct DB query
    return db
      .select({
        id: technologyPattern.id,
        technology: technologyPattern.technology,
        category: technologyPattern.category,
        pattern: technologyPattern.pattern,
        patternType: technologyPattern.patternType,
        confirmedCount: technologyPattern.confirmedCount,
      })
      .from(technologyPattern)
      .where(gt(technologyPattern.confirmedCount, 0))
  }
}

/**
 * Invalidates pattern cache (call after learning new patterns)
 */
export const invalidatePatternCache = async (): Promise<void> => {
  try {
    await redisClient.redis.del(CACHE_KEY)
    logger.debug({
      msg: '[Pattern Cache] Cache invalidated',
      event: 'pattern_cache_invalidated',
    })
  } catch (error) {
    logger.error({
      msg: '[Pattern Cache] Failed to invalidate cache',
      event: 'pattern_cache_invalidation_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })
  }
}

/**
 * Re-export matchPatternsInMemory from utils for backward compatibility
 */
export const matchPatternsInMemory = matchPatternsInMemoryUtil
