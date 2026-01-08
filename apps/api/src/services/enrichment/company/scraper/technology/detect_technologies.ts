import { logger } from '@ritchy/logger'
import {
  createSimpleDurationTimer,
  enrichmentDurationHistogram,
} from '../../../../../metrics/collectors'
import { deduplicateTechnologies } from './detect_technologies_utils'
import { extractScripts } from './extract_scripts'
import { identifyScriptsBatch } from './llm_detector'
import { learnPatternsFromResults } from './pattern_learner'
import { matchAgainstPatterns } from './pattern_matcher'
import type { DetectedTechnology } from './types'

// Configuration constants
const LLM_ACTIVATION_THRESHOLD = 5 // Minimum unmatched scripts to trigger LLM

/**
 * Main entry point for technology detection
 * Coordinates extraction, pattern matching, and LLM detection
 */
export const detectTechnologies = async (
  rawHtml: string,
  url: string,
  enrichmentId: string,
): Promise<DetectedTechnology[]> => {
  const timer = createSimpleDurationTimer(enrichmentDurationHistogram)
  const startTime = Date.now()

  logger.debug({
    msg: `[Technology Detection] Starting detection for ${url}`,
    event: 'detection_start',
    metadata: { url, enrichmentId },
  })

  try {
    // STEP 1: Extract all scripts from HTML
    const scripts = extractScripts(rawHtml, url)

    if (scripts.length === 0) {
      logger.debug({
        msg: `[Technology Detection] No scripts found in ${url}`,
        event: 'no_scripts_found',
        metadata: { url, enrichmentId },
      })

      // Stop timer before returning
      timer.stop({
        enrichment_type: 'website',
        subprocess: 'technology_detection',
        cached: 'false',
      })

      return []
    }

    // STEP 2: Match against known patterns (Redis-cached)
    const { matched, unmatched } = await matchAgainstPatterns(scripts)

    // STEP 3: Decide if LLM is needed
    const shouldUseLLM = unmatched.length >= LLM_ACTIVATION_THRESHOLD

    if (!shouldUseLLM) {
      logger.debug({
        msg: `[Technology Detection] Skipping LLM (only ${unmatched.length} unmatched)`,
        event: 'llm_skipped',
        metadata: { url, unmatchedCount: unmatched.length },
      })

      // Stop timer before returning
      timer.stop({
        enrichment_type: 'website',
        subprocess: 'technology_detection',
        cached: 'false',
      })

      return matched
    }

    // STEP 4: Use LLM for unmatched scripts
    logger.debug({
      msg: `[Technology Detection] Using LLM for ${unmatched.length} unmatched scripts`,
      event: 'llm_detection_start',
      metadata: { url, unmatchedCount: unmatched.length },
    })

    const llmResults = await identifyScriptsBatch(unmatched)

    // STEP 5: Learn patterns from LLM results (async, don't wait)
    if (llmResults.length > 0) {
      learnPatternsFromResults(llmResults).catch((err) => {
        logger.error({
          msg: '[Technology Detection] Failed to learn patterns',
          event: 'pattern_learning_error',
          metadata: { error: err },
        })
      })
    }

    // STEP 6: Merge results
    const llmDetections: DetectedTechnology[] = llmResults.map((r) => ({
      technology: r.technology,
      category: r.category,
      confidence: r.confidence,
      evidence: r.evidence,
      detectionMethod: 'llm' as const,
    }))

    const allDetections = [...matched, ...llmDetections]

    // STEP 7: Deduplicate case-insensitively
    const { unique: finalResults, duplicates } =
      deduplicateTechnologies(allDetections)

    if (duplicates.length > 0) {
      logger.debug({
        msg: '[Technology Detection] Deduplicated case variations',
        event: 'case_deduplication',
        metadata: {
          url,
          duplicates,
        },
      })
    }
    const totalTime = Date.now() - startTime

    // Stop timer with metrics
    timer.stop({
      enrichment_type: 'website',
      subprocess: 'technology_detection',
      cached: 'false',
    })

    // Only log summary at info level
    logger.info({
      msg: `[Technology Detection] Detected ${finalResults.length} technologies in ${totalTime}ms`,
      event: 'detection_complete',
      metadata: {
        enrichmentId,
        count: finalResults.length,
        technologies: finalResults.map((r) => r.technology),
      },
    })

    // Detailed breakdown at debug level
    logger.debug({
      msg: '[Technology Detection] Detection details',
      event: 'detection_details',
      metadata: {
        url,
        totalScripts: scripts.length,
        patternMatched: matched.length,
        llmDiscovered: llmDetections.length,
        totalTimeMs: totalTime,
      },
    })

    return finalResults
  } catch (error) {
    // Stop timer even on error
    timer.stop({
      enrichment_type: 'website',
      subprocess: 'technology_detection',
      cached: 'false',
    })

    // Re-throw error after recording metrics
    throw error
  }
}
