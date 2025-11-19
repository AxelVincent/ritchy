import { logger } from '@ritchy/logger'
import { sql } from 'drizzle-orm'
import { db } from '../../../../db/db'
import { getActivePatterns, matchPatternsInMemory } from './pattern_cache'
import type { DetectedTechnology, ExtractedScript } from './types'

/**
 * Matches extracted scripts against known patterns using Redis-cached patterns
 * Falls back to DB query if cache unavailable
 */
export const matchAgainstPatterns = async (
  scripts: ExtractedScript[],
): Promise<{
  matched: DetectedTechnology[]
  unmatched: ExtractedScript[]
}> => {
  if (scripts.length === 0) {
    return { matched: [], unmatched: [] }
  }

  const startTime = Date.now()

  try {
    // Fetch patterns from cache (or DB on cache miss)
    const patterns = await getActivePatterns()

    // Perform in-memory matching
    const { matched, matchedScriptIndices } = matchPatternsInMemory(
      scripts,
      patterns,
    )

    // Find unmatched scripts
    const unmatched = scripts.filter(
      (_, index) => !matchedScriptIndices.has(index),
    )

    const queryTime = Date.now() - startTime

    // Increment match count for patterns (async, don't await)
    if (matched.length > 0) {
      const patternIds = matched
        .map((m) => m.patternId)
        .filter((id): id is string => !!id)

      db.execute(sql`
        UPDATE technology_pattern
        SET match_count = match_count + 1
        WHERE id = ANY(ARRAY[${sql.join(
          patternIds.map((id) => sql`${id}::uuid`),
          sql`, `,
        )}])
      `).catch((err) => {
        logger.error({
          msg: '[Technology Detection] Failed to increment match count',
          event: 'pattern_match_count_error',
          metadata: { error: err },
        })
      })
    }

    logger.debug({
      msg: `[Technology Detection] Matched ${matched.length}/${scripts.length} scripts in ${queryTime}ms`,
      event: 'pattern_match_complete',
      metadata: {
        totalScripts: scripts.length,
        matched: matched.length,
        unmatched: unmatched.length,
        queryTimeMs: queryTime,
        technologies: matched.map((m) => m.technology),
      },
    })

    return {
      matched: matched.map((m) => ({
        ...m,
        detectionMethod: 'pattern' as const,
      })),
      unmatched,
    }
  } catch (error) {
    logger.error({
      msg: '[Technology Detection] Pattern matching failed',
      event: 'pattern_match_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        scriptCount: scripts.length,
      },
    })

    // Return empty results on error
    return { matched: [], unmatched: scripts }
  }
}
