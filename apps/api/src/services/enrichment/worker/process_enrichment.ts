import { logger } from '@ritchy/logger'
import type { EnrichResponse, EnrichmentJobResult } from '@ritchy/types'
import { db } from '../../../db/db'
import { enrichment as enrichmentTable, userPlace } from '../../../db/schema'
import { fetchOrCreateContact } from '../../contact/fetch_or_create_contact'
import { extractSocialPlatformFromUrl } from '../../contact/utils/extract_social_platform_from_url'
import { getOrFetchEnrichmentData } from '../get_or_fetch_enrichment_data'
import { saveEnrichmentData } from '../save_enrichment_data'
import { eq } from 'drizzle-orm'

interface EnrichmentRequest {
  userPlaceId: string
  domain: string
}

/**
 * Processes a single enrichment request.
 * Handles enrichment, persistence, and error reporting.
 */
export const process_enrichment = async (
  enrichment: EnrichmentRequest,
  userId: string,
  jobId: string
): Promise<EnrichmentJobResult> => {
  const { userPlaceId, domain } = enrichment

  logger.info({
    msg: 'Processing individual enrichment',
    event: 'individual_enrichment_start',
    metadata: { jobId, userPlaceId, domain, userId }
  })

  try {
    // Get or fetch enrichment data
    const enrichedData = await getOrFetchEnrichmentData(userPlaceId, domain)

    if (!enrichedData) {
      logger.warn({
        msg: 'Enrichment failed to produce data',
        event: 'individual_enrichment_no_data',
        metadata: { jobId, userPlaceId, domain, userId }
      })

      return {
        userPlaceId,
        success: false,
        error: 'Failed to enrich website'
      }
    }

    try {
      // TODO: Use versioned DB
      await db
        .update(userPlace)
        .set({
          isEnriched: true
        })
        .where(eq(userPlace.id, userPlaceId))

      // Get or create contact for this place and user
      const contact = await fetchOrCreateContact(userPlaceId, userId)

      const savedEnrichment = await saveEnrichmentData({
        contactId: contact.id,
        enrichmentData: enrichedData
      })

      logger.info({
        msg: 'Individual enrichment completed successfully',
        event: 'individual_enrichment_success',
        metadata: {
          jobId,
          userPlaceId,
          userId,
          contactId: contact.id,
          stats: {
            emailsFound: enrichedData.emails.length,
            socialPlatformsFound: Object.keys(enrichedData.socialLinks).length
          }
        }
      })

      const data: EnrichResponse = {
        id: userPlaceId,
        emails: savedEnrichment.emailResults.emails,
        socialLinks: Object.fromEntries(
          savedEnrichment.socialResults.socials
            .map((url) => {
              const platform = extractSocialPlatformFromUrl(url)
              return platform !== 'unknown' ? [platform, [url]] : null
            })
            .filter(Boolean) as [string, string[]][]
        ),
        domainRegistration: enrichedData.domainRegistration
      }

      logger.info({
        msg: 'Enrichment data saved successfully',
        event: 'enrichment_data_saved',
        metadata: {
          jobId,
          userPlaceId,
          userId,
          contactId: contact.id,
          enrichmentData: enrichedData,
          enrichmentDataSaved: data,
          stats: {
            emailsSaved: savedEnrichment.emailResults.emailsSaved,
            socialLinksSaved: savedEnrichment.socialResults.socialLinksSaved
          }
        }
      })

      return {
        userPlaceId,
        success: true,
        data
      }
    } catch (saveError) {
      logger.error({
        msg: 'Failed to save enrichment data to database',
        event: 'individual_enrichment_save_error',
        metadata: {
          jobId,
          userPlaceId,
          userId,
          error:
            saveError instanceof Error ? saveError.message : String(saveError)
        }
      })

      // Return success since enrichment worked, just database save failed
      return {
        userPlaceId,
        success: true,
        data: enrichedData,
        warning: 'Data enriched but failed to save to database'
      }
    }
  } catch (error) {
    logger.error({
      msg: 'Individual enrichment process failed',
      event: 'individual_enrichment_error',
      metadata: {
        jobId,
        userPlaceId,
        domain,
        userId,
        error: error instanceof Error ? error.message : String(error)
      }
    })

    return {
      userPlaceId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
