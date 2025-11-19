import { logger } from '@ritchy/logger'
import { extractScripts } from './extract_scripts'
import { identifyScriptsBatch } from './llm_detector'
import { learnPatternsFromResults } from './pattern_learner'
import { matchAgainstPatterns } from './pattern_matcher'
import type { DetectedTechnology } from './types'

/**
 * Main entry point for technology detection
 * Coordinates extraction, pattern matching, and LLM detection
 */
export const detectTechnologies = async (
  rawHtml: string,
  url: string,
  enrichmentId: string,
): Promise<DetectedTechnology[]> => {
  const startTime = Date.now()

  logger.debug({
    msg: `[Technology Detection] Starting detection for ${url}`,
    event: 'detection_start',
    metadata: { url, enrichmentId },
  })

  // STEP 1: Extract all scripts from HTML
  const scripts = extractScripts(rawHtml, url)

  if (scripts.length === 0) {
    logger.debug({
      msg: `[Technology Detection] No scripts found in ${url}`,
      event: 'no_scripts_found',
      metadata: { url, enrichmentId },
    })
    return []
  }

  // STEP 2: Match against known patterns (batch DB query)
  const { matched, unmatched } = await matchAgainstPatterns(scripts)

  // STEP 3: Decide if LLM is needed
  const shouldUseLLM = unmatched.length >= 5

  if (!shouldUseLLM) {
    logger.debug({
      msg: `[Technology Detection] Skipping LLM (only ${unmatched.length} unmatched)`,
      event: 'llm_skipped',
      metadata: { url, unmatchedCount: unmatched.length },
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

  // Deduplicate case-insensitively (LLM may return "BSport" and "Bsport")
  // Keep the version with higher confidence, or first occurrence if equal
  const unique = new Map<string, DetectedTechnology>()
  const duplicatesFound: string[] = []

  for (const detection of allDetections) {
    const normalizedKey = detection.technology.toLowerCase()
    const existing = unique.get(normalizedKey)

    if (existing && existing.technology !== detection.technology) {
      duplicatesFound.push(
        `${existing.technology} vs ${detection.technology} (kept: ${detection.confidence > existing.confidence ? detection.technology : existing.technology})`,
      )
    }

    if (!existing || detection.confidence > existing.confidence) {
      unique.set(normalizedKey, detection)
    }
  }

  if (duplicatesFound.length > 0) {
    logger.debug({
      msg: '[Technology Detection] Deduplicated case variations',
      event: 'case_deduplication',
      metadata: {
        url,
        duplicates: duplicatesFound,
      },
    })
  }

  const finalResults = Array.from(unique.values())
  const totalTime = Date.now() - startTime

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
}
