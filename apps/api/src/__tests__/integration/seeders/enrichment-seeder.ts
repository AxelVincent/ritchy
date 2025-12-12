import { eq } from 'drizzle-orm'
import {
  enrichment,
  enrichmentCompany,
  enrichmentFacebook,
  enrichmentInstagram,
  enrichmentLinkedin,
  enrichmentTechnology,
  userPlace,
} from '../../../db/schema'
import { getTestDb } from '../setup/test-database'

export interface EnrichmentData {
  shortDescription?: string
  domainRegisteredAt?: string
  workforceRange?: string
  dateOfCreation?: string
  technologies?: string[]
  facebookUrl?: string
  instagramUrl?: string
  linkedinUrl?: string
  score?: number
}

export const seedEnrichment = async (
  placeId: string,
  userPlaceId: string,
  data: EnrichmentData,
) => {
  const db = getTestDb()
  const enrichmentId = crypto.randomUUID()

  await db.insert(enrichment).values({
    id: enrichmentId,
    placeId: placeId,
    success: true,
    shortDescription: data.shortDescription,
    domainRegisteredAt: data.domainRegisteredAt
      ? new Date(data.domainRegisteredAt)
      : undefined,
    score: data.score,
  })

  // Mark userPlace as enriched
  await db
    .update(userPlace)
    .set({ enriched_at: new Date() })
    .where(eq(userPlace.id, userPlaceId))

  // enrichmentCompany has required fields: company_number, country_code, name, status
  if (data.workforceRange || data.dateOfCreation) {
    await db.insert(enrichmentCompany).values({
      id: crypto.randomUUID(),
      enrichment_id: enrichmentId,
      company_number: `TEST-${crypto.randomUUID().slice(0, 8)}`,
      country_code: 'FR',
      name: 'Test Company',
      status: 'active',
      workforce_range: data.workforceRange,
      date_of_creation: data.dateOfCreation
        ? new Date(data.dateOfCreation)
        : undefined,
    })
  }

  if (data.technologies?.length) {
    for (const tech of data.technologies) {
      await db.insert(enrichmentTechnology).values({
        id: crypto.randomUUID(),
        enrichmentId: enrichmentId,
        technology: tech,
        category: 'detected',
        confidence: 100,
        detectionMethod: 'test',
      })
    }
  }

  // Social media URLs for filter testing
  if (data.facebookUrl) {
    await db.insert(enrichmentFacebook).values({
      id: crypto.randomUUID(),
      enrichmentId: enrichmentId,
      url: data.facebookUrl,
    })
  }

  if (data.instagramUrl) {
    await db.insert(enrichmentInstagram).values({
      id: crypto.randomUUID(),
      enrichmentId: enrichmentId,
      url: data.instagramUrl,
    })
  }

  if (data.linkedinUrl) {
    await db.insert(enrichmentLinkedin).values({
      id: crypto.randomUUID(),
      enrichmentId: enrichmentId,
      url: data.linkedinUrl,
    })
  }

  return enrichmentId
}
