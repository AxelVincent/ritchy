import type { CachedPattern } from './pattern_cache'

/**
 * Calculates confidence score based on pattern confirmation count
 */
export const calculateConfidence = (confirmedCount: number): number => {
  const BASE_CONFIDENCE = 60
  const CONFIRMATION_BOOST = 3
  const MAX_CONFIDENCE = 95

  return Math.min(
    MAX_CONFIDENCE,
    BASE_CONFIDENCE + confirmedCount * CONFIRMATION_BOOST,
  )
}

type MatchResult = {
  technology: string
  category: string
  confidence: number
  evidence: string
  patternId: string
}

/**
 * Performs in-memory pattern matching against scripts
 * Much faster than DB CROSS JOIN + LIKE
 * Pure function - no side effects, easy to test
 */
export const matchPatternsInMemory = (
  scripts: Array<{ type: string; value: string }>,
  patterns: CachedPattern[],
): {
  matched: MatchResult[]
  matchedScriptIndices: Set<number>
} => {
  const matched = new Map<string, MatchResult>()
  const matchedScriptIndices = new Set<number>()

  // For each script, check against all patterns
  scripts.forEach((script, index) => {
    const scriptLower = script.value.toLowerCase()

    for (const pattern of patterns) {
      const patternLower = pattern.pattern.toLowerCase()

      if (scriptLower.includes(patternLower)) {
        matchedScriptIndices.add(index)

        // Use highest confidence pattern per technology
        const existing = matched.get(pattern.technology)
        const confidence = calculateConfidence(pattern.confirmedCount)

        if (!existing || confidence > existing.confidence) {
          matched.set(pattern.technology, {
            technology: pattern.technology.toLowerCase(), // Normalize to lowercase
            category: pattern.category,
            confidence,
            evidence: script.value.slice(0, 200),
            patternId: pattern.id,
          })
        }
      }
    }
  })

  return {
    matched: Array.from(matched.values()),
    matchedScriptIndices,
  }
}
