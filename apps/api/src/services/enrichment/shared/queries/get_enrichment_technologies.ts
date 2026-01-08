import { desc, eq } from 'drizzle-orm'
import { db } from '../../../../db/db'
import { enrichmentTechnology } from '../../../../db/schema/enrichment'

/**
 * Get all technologies detected for an enrichment, grouped by category
 */
export const getEnrichmentTechnologies = async (enrichmentId: string) => {
  const technologies = await db.query.enrichmentTechnology.findMany({
    where: eq(enrichmentTechnology.enrichmentId, enrichmentId),
    orderBy: desc(enrichmentTechnology.confidence),
  })

  // Group by category
  const grouped = technologies.reduce(
    (acc, tech) => {
      if (!acc[tech.category]) {
        acc[tech.category] = []
      }
      acc[tech.category].push({
        technology: tech.technology,
        confidence: tech.confidence,
        evidence: tech.evidence,
        detectionMethod: tech.detectionMethod,
      })
      return acc
    },
    {} as Record<
      string,
      Array<{
        technology: string
        confidence: number
        evidence: string | null
        detectionMethod: string
      }>
    >,
  )

  return {
    total: technologies.length,
    byCategory: grouped,
    technologies: technologies.map((t) => ({
      technology: t.technology,
      category: t.category,
      confidence: t.confidence,
    })),
  }
}
