import { logger } from '@ritchy/logger'
import { sql } from 'drizzle-orm'
import { db } from '../../../../db/db'
import type { DetectedTechnology, ExtractedScript } from './types'

/**
 * Matches extracted scripts against known patterns using a single batch query
 * Returns matched technologies and unmatched scripts
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

  // Prepare script values for SQL query
  const scriptValues = scripts.map((s) => s.value.toLowerCase())

  // Debug logging: Show what scripts we're trying to match
  logger.debug({
    msg: '[Technology Detection] Scripts to match',
    event: 'pattern_match_scripts',
    metadata: {
      scriptCount: scripts.length,
      scripts: scripts.map((s) => ({
        type: s.type,
        value: s.value.substring(0, 100), // First 100 chars
        valueLower: s.value.toLowerCase().substring(0, 100),
      })),
    },
  })

  // Debug: Query all patterns in DB to see what we're matching against
  const allPatterns = (await db.execute<{
    pattern: string
    technology: string
    confirmed_count: number
    pattern_type: string
  }>(sql`
    SELECT pattern, technology, confirmed_count, pattern_type
    FROM technology_pattern
    WHERE confirmed_count > 0
    ORDER BY technology
  `)) as unknown as Array<{
    pattern: string
    technology: string
    confirmed_count: number
    pattern_type: string
  }>

  logger.debug({
    msg: '[Technology Detection] Available patterns in DB',
    event: 'pattern_match_available_patterns',
    metadata: {
      patternCount: allPatterns.length,
      patterns: allPatterns.map((p) => ({
        technology: p.technology,
        pattern: p.pattern,
        confirmedCount: p.confirmed_count,
        patternType: p.pattern_type,
      })),
    },
  })

  // Single batch query - checks ALL scripts against ALL patterns
  const matchedPatterns = (await db.execute<{
    technology: string
    category: string
    pattern: string
    confirmed_count: number
    script_value: string
    pattern_id: string
  }>(sql`
    WITH script_inputs AS (
      SELECT unnest(ARRAY[${sql.join(
        scriptValues.map((v) => sql`${v}`),
        sql`, `,
      )}]::text[]) AS script_value
    )
    SELECT DISTINCT ON (tp.technology)
      tp.id as pattern_id,
      tp.technology,
      tp.category,
      tp.pattern,
      tp.confirmed_count,
      si.script_value
    FROM technology_pattern tp
    CROSS JOIN script_inputs si
    WHERE
      tp.confirmed_count > 0
      AND si.script_value LIKE '%' || LOWER(tp.pattern) || '%'
    ORDER BY tp.technology, tp.confirmed_count DESC
  `)) as unknown as Array<{
    technology: string
    category: string
    pattern: string
    confirmed_count: number
    script_value: string
    pattern_id: string
  }>

  const queryTime = Date.now() - startTime

  // Debug logging: Show what patterns matched
  logger.debug({
    msg: '[Technology Detection] Query results',
    event: 'pattern_match_results',
    metadata: {
      matchedCount: matchedPatterns.length,
      queryTimeMs: queryTime,
      matches: matchedPatterns.map((m) => ({
        technology: m.technology,
        pattern: m.pattern,
        confirmedCount: m.confirmed_count,
        scriptMatched: m.script_value.substring(0, 100),
      })),
    },
  })

  // Build matched technologies
  const matched: DetectedTechnology[] = matchedPatterns.map((row) => ({
    technology: row.technology,
    category: row.category,
    confidence: Math.min(95, 60 + row.confirmed_count * 3),
    evidence: row.script_value.slice(0, 200),
    detectionMethod: 'pattern' as const,
    patternId: row.pattern_id,
  }))

  // Increment match count for patterns (async, don't await)
  if (matchedPatterns.length > 0) {
    const patternIds = matchedPatterns.map((r) => r.pattern_id)

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

  // Find unmatched scripts
  const matchedScriptValues = new Set(
    matchedPatterns.map((r) => r.script_value),
  )

  const unmatched = scripts.filter(
    (s) => !matchedScriptValues.has(s.value.toLowerCase()),
  )

  // Debug logging: Show unmatched scripts
  logger.debug({
    msg: '[Technology Detection] Unmatched scripts',
    event: 'pattern_match_unmatched',
    metadata: {
      unmatchedCount: unmatched.length,
      unmatched: unmatched.map((s) => ({
        type: s.type,
        value: s.value.substring(0, 100),
        valueLower: s.value.toLowerCase().substring(0, 100),
      })),
    },
  })

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

  return { matched, unmatched }
}
