import type { DetectedTechnology } from './types'

/**
 * Deduplicates technologies case-insensitively
 * Keeps the version with higher confidence, or first occurrence if equal
 * Pure function - no side effects, easy to test
 */
export const deduplicateTechnologies = (
  technologies: DetectedTechnology[],
): { unique: DetectedTechnology[]; duplicates: string[] } => {
  const unique = new Map<string, DetectedTechnology>()
  const duplicatesFound: string[] = []

  for (const detection of technologies) {
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

  return {
    unique: Array.from(unique.values()),
    duplicates: duplicatesFound,
  }
}
