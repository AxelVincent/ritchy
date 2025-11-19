import { logger } from '@ritchy/logger'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '../../../../db/db'
import { technologyPattern } from '../../../../db/schema/enrichment'
import { invalidatePatternCache } from './pattern_cache'
import type { LLMIdentification } from './types'

/**
 * Learns new patterns from LLM identifications
 * Upserts patterns in a single batch query for efficiency
 */
export const learnPatternsFromResults = async (
  identifications: LLMIdentification[],
): Promise<void> => {
  if (identifications.length === 0) return

  // Filter and prepare valid patterns
  const validPatterns = identifications
    .map((identification) => {
      const pattern = identification.keyPattern.toLowerCase().trim()
      if (pattern.length < 5 || pattern.length > 100) return null

      return {
        technology: identification.technology.toLowerCase(), // Normalize to lowercase
        category: identification.category,
        pattern,
        patternType: inferPatternType(identification.evidence),
        matchCount: 0,
        confirmedCount: 1,
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)

  if (validPatterns.length === 0) {
    logger.debug({
      msg: '[Pattern Learner] No valid patterns to learn',
      event: 'pattern_learning_skipped',
    })
    return
  }

  // Deduplicate patterns by technology+pattern combination to avoid
  // "ON CONFLICT DO UPDATE command cannot affect row a second time" error
  const uniquePatterns = Array.from(
    new Map(
      validPatterns.map((p) => [`${p.technology}:${p.pattern}`, p]),
    ).values(),
  )

  if (uniquePatterns.length < validPatterns.length) {
    logger.debug({
      msg: `[Pattern Learner] Deduplicated ${validPatterns.length} patterns to ${uniquePatterns.length} unique`,
      event: 'pattern_deduplication',
      metadata: {
        original: validPatterns.length,
        unique: uniquePatterns.length,
      },
    })
  }

  try {
    // Batch upsert all unique patterns in a single query
    const results = await db
      .insert(technologyPattern)
      .values(uniquePatterns)
      .onConflictDoUpdate({
        target: [technologyPattern.technology, technologyPattern.pattern],
        set: {
          confirmedCount: sql`${technologyPattern.confirmedCount} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning({
        technology: technologyPattern.technology,
        pattern: technologyPattern.pattern,
        confirmedCount: technologyPattern.confirmedCount,
      })

    // Invalidate cache after learning new patterns
    await invalidatePatternCache()

    // Count new vs reinforced patterns
    const learnedCount = {
      new: results.filter((r) => r.confirmedCount === 1).length,
      reinforced: results.filter((r) => r.confirmedCount > 1).length,
    }

    // Only log summary if there are new patterns
    if (learnedCount.new > 0) {
      const newPatterns = results
        .filter((r) => r.confirmedCount === 1)
        .map((r) => r.technology)

      logger.info({
        msg: `[Pattern Learner] Learned ${learnedCount.new} new patterns`,
        event: 'pattern_learning_complete',
        metadata: {
          newCount: learnedCount.new,
          technologies: newPatterns,
        },
      })
    }

    // Detailed breakdown at debug level
    logger.debug({
      msg: `[Pattern Learner] Batch complete: ${learnedCount.new} new, ${learnedCount.reinforced} reinforced`,
      event: 'pattern_learning_details',
      metadata: {
        ...learnedCount,
        totalProcessed: uniquePatterns.length,
        patterns: results.map((r) => ({
          technology: r.technology,
          pattern: r.pattern,
          confirmedCount: r.confirmedCount,
        })),
      },
    })
  } catch (error) {
    logger.error({
      msg: '[Technology Detection] Failed to learn patterns in batch',
      event: 'pattern_learn_batch_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        patternsAttempted: uniquePatterns.length,
      },
    })
  }
}

const inferPatternType = (evidence: string): string => {
  if (evidence.startsWith('http')) {
    return evidence.includes('iframe') ? 'iframe' : 'script_url'
  }
  if (evidence.includes(':')) {
    return 'meta_tag'
  }
  return 'inline_code'
}
