import { logger } from '@ritchy/logger'
import type { CompanyEnrichmentResponse } from '@ritchy/types'
import { UnrecoverableError } from 'bullmq'
import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { enrichment as enrichmentTable } from '../../../db/schema'
import { getCrawlStrategy } from '../../../external/langchain/get_crawl_strategy'
import { getWebsiteDescription } from '../../../external/langchain/get_website_description'
import { deleteWebsiteVectors } from '../../../external/qdrant/queries/delete_website_vectors'
import { getWebsiteVectors } from '../../../external/qdrant/queries/get_website_vectors'
import { performWhoisLookup } from '../../../external/whois/who_is_lookup'
import { enqueueScraperJob } from '../../../internal/bullmq/jobs/scraper/queue'
import { extractErrorMessage } from '../../../internal/bullmq/utils/extract-error-message'
import { startEnrichmentTracking } from '../../../metrics/enrichment'
import { populateContactFromEnrichment } from '../../contact/populate_contact_from_enrichment'
import {
  INSUFFICIENT_CREDITS_ERROR,
  USER_CREDITS_NOT_FOUND_ERROR,
  consumeCredits,
} from '../../payment/queries/consume_credits'
import { refundCredits } from '../../payment/queries/refund_credits'
import { COMPANY_CREDITS } from '../shared/config/constants'
import { getFullCompanyEnrichmentData } from '../shared/queries/get_full_company_enrichment_data'
import { setCompanyEnrichmentStatus } from '../shared/status/status_manager'
import { calculateEnrichmentScore } from '../shared/utils/calculate_enrichment_score'
import { isSocialMediaUrl } from '../shared/utils/is_social_media_url'
import { isSubPage } from '../shared/utils/is_sub_page'
import { processSocialMediaDomain } from '../shared/utils/process_social_media_domain'
import { enrichGovernmentalData } from './governmental/enrich_governmental_data'
import { getBusinessName } from './queries/get_business_name'
import { getBusinessWebsite } from './queries/get_business_website'
import { getMainDomain } from './scraper/utils/get_main_domain'

interface CompanyEnrichmentParams {
  userPlaceId: string
  enrichmentId: string
  placeId: string
  userId: string
}

/**
 * Company enrichment service
 *
 * This is the company phase of enrichment, extracted from websiteEnrichmentManager.
 * It handles:
 * 1. Website scraping (homepage + subpages)
 * 2. WHOIS lookup
 * 3. Company data lookup (Pappers)
 * 4. Website description generation
 * 5. Contact creation from officers (via populateContactFromEnrichment)
 *
 * Officer-level enrichment (LinkedIn, Email, Phone) is handled separately
 * by the officer enrichment worker.
 *
 * Returns rich data including all enrichment results for external API use.
 * Idempotent - returns cached data if already enriched.
 */
export const companyEnrichmentService = async ({
  userPlaceId,
  enrichmentId,
  placeId,
  userId,
}: CompanyEnrichmentParams): Promise<CompanyEnrichmentResponse> => {
  const startTime = Date.now()

  logger.info({
    msg: 'Starting company enrichment service',
    event: 'company_enrichment_service_start',
    metadata: {
      userPlaceId,
      enrichmentId,
    },
  })

  // Check eligibility - skip if already enriched or in progress (idempotent)
  const [existing] = await db
    .select({ companyStatus: enrichmentTable.companyStatus })
    .from(enrichmentTable)
    .where(eq(enrichmentTable.id, enrichmentId))
    .limit(1)

  if (existing?.companyStatus === 'completed') {
    logger.info({
      msg: 'Company already enriched, returning cached data',
      event: 'company_enrichment_already_completed',
      metadata: { userPlaceId, enrichmentId },
    })
    const data = await getFullCompanyEnrichmentData(userPlaceId)
    return {
      success: true,
      alreadyEnriched: true,
      data,
    }
  }

  if (existing?.companyStatus === 'processing') {
    logger.info({
      msg: 'Company enrichment already in progress, skipping',
      event: 'company_enrichment_in_progress',
      metadata: { userPlaceId, enrichmentId },
    })
    return {
      success: true,
      alreadyEnriched: true,
      data: null, // In progress, data not yet available
    }
  }

  // Initialize tracker for company enrichment
  const enrichmentTracker = startEnrichmentTracking('company', false)

  // Consume credits upfront (will be refunded on failure)
  await consumeCredits(userId, COMPANY_CREDITS)

  try {
    // Step 1: Extract website (0-10%)
    await setCompanyEnrichmentStatus(
      userPlaceId,
      'processing',
      'Extracting business website',
      5,
    )

    const website = await getBusinessWebsite(userPlaceId)

    if (!website) {
      await setCompanyEnrichmentStatus(
        userPlaceId,
        'processing',
        'No website found, using alternative sources',
        10,
      )

      // Update enrichment record for no-website case
      await db
        .update(enrichmentTable)
        .set({
          domain: null,
          domainRegisteredAt: null,
          success: true,
          companyStatus: 'processing',
        })
        .where(eq(enrichmentTable.id, enrichmentId))

      // Try governmental data enrichment
      await setCompanyEnrichmentStatus(
        userPlaceId,
        'processing',
        'Searching governmental databases',
        40,
      )

      const governmentalDataResult = await enrichmentTracker.trackSubprocess(
        'governmental_data',
        async () => {
          const place = await db.query.place.findFirst({
            where: (place, { eq }) => eq(place.id, placeId),
          })
          if (!place) throw new Error('Place not found')
          return await enrichGovernmentalData({
            place,
            enrichmentId,
            context: { userPlaceId, trackStatus: false },
          })
        },
      )

      if (governmentalDataResult.companyData) {
        logger.info({
          msg: 'Governmental data found (no website scenario)',
          event: 'governmental_data_found_no_website',
          metadata: { governmentalDataResult },
        })
      }

      // Create contacts from officers
      await setCompanyEnrichmentStatus(
        userPlaceId,
        'processing',
        'Creating contacts from officers',
        80,
      )

      await enrichmentTracker.trackSubprocess('populate_contacts', async () => {
        return await populateContactFromEnrichment({
          enrichmentId,
          userPlaceId,
        })
      })

      // Calculate score
      const enrichmentScore = await enrichmentTracker.trackSubprocess(
        'calculate_score',
        async () => calculateEnrichmentScore(enrichmentId),
      )

      // Finalize
      await db
        .update(enrichmentTable)
        .set({
          companyStatus: 'completed',
          companyEnrichedAt: new Date(),
          score: enrichmentScore,
          success: true,
        })
        .where(eq(enrichmentTable.id, enrichmentId))

      await setCompanyEnrichmentStatus(
        userPlaceId,
        'completed',
        'Company enrichment completed',
        100,
      )

      enrichmentTracker.markSuccess()

      logger.info({
        msg: 'Company enrichment completed (no website)',
        event: 'company_enrichment_completed_no_website',
        metadata: {
          userPlaceId,
          enrichmentId,
          timeToEnrich: Date.now() - startTime,
        },
      })

      const data = await getFullCompanyEnrichmentData(userPlaceId)
      if (data) {
        data.creditsUsed = COMPANY_CREDITS
      }
      return {
        success: true,
        alreadyEnriched: false,
        data,
      }
    }

    // Step 2: Validate domain (10-15%)
    await setCompanyEnrichmentStatus(
      userPlaceId,
      'processing',
      'Validating website domain',
      12,
    )

    const domain = getMainDomain(website)

    // Update enrichment with domain
    await db
      .update(enrichmentTable)
      .set({
        domain,
        success: true,
        companyStatus: 'processing',
      })
      .where(eq(enrichmentTable.id, enrichmentId))

    // Handle social media (quick path)
    if (isSocialMediaUrl(website)) {
      await setCompanyEnrichmentStatus(
        userPlaceId,
        'processing',
        `Analyzing social profile: ${website}`,
        20,
      )

      await processSocialMediaDomain({
        enrichmentId,
        website,
      })

      // Create contacts from officers
      await setCompanyEnrichmentStatus(
        userPlaceId,
        'processing',
        'Creating contacts from officers',
        80,
      )

      await enrichmentTracker.trackSubprocess('populate_contacts', async () => {
        return await populateContactFromEnrichment({
          enrichmentId,
          userPlaceId,
        })
      })

      // Calculate score
      const enrichmentScore = await enrichmentTracker.trackSubprocess(
        'calculate_score',
        async () => calculateEnrichmentScore(enrichmentId),
      )

      await db
        .update(enrichmentTable)
        .set({
          companyStatus: 'completed',
          companyEnrichedAt: new Date(),
          score: enrichmentScore,
          success: true,
        })
        .where(eq(enrichmentTable.id, enrichmentId))

      await setCompanyEnrichmentStatus(
        userPlaceId,
        'completed',
        'Company enrichment completed',
        100,
      )

      enrichmentTracker.markSuccess()

      logger.info({
        msg: 'Company enrichment completed (social media)',
        event: 'company_enrichment_completed_social_media',
        metadata: {
          userPlaceId,
          enrichmentId,
          website,
          timeToEnrich: Date.now() - startTime,
        },
      })

      const data = await getFullCompanyEnrichmentData(userPlaceId)
      if (data) {
        data.creditsUsed = COMPANY_CREDITS
      }
      return {
        success: true,
        alreadyEnriched: false,
        data,
      }
    }

    // Check if subpage
    if (isSubPage(website)) {
      logger.debug({
        msg: 'Website is a subpage',
        event: 'website_is_subpage',
        metadata: { website },
      })
    }

    // Step 3: Prepare scraping (15-20%)
    await setCompanyEnrichmentStatus(
      userPlaceId,
      'processing',
      'Preparing website scanner',
      15,
    )

    const websiteVectors = await getWebsiteVectors(domain)

    if (websiteVectors.length > 0) {
      await setCompanyEnrichmentStatus(
        userPlaceId,
        'processing',
        'Initializing fresh scan',
        17,
      )
      await deleteWebsiteVectors(domain)
    }

    // Step 4: Scrape homepage (18-30%)
    await setCompanyEnrichmentStatus(
      userPlaceId,
      'processing',
      `Scanning homepage: ${website}`,
      18,
    )

    let scrapeResult: Awaited<ReturnType<typeof enqueueScraperJob>> | null =
      null
    let scrapeError: string | null = null

    try {
      scrapeResult = await enrichmentTracker.trackSubprocess(
        'scrape_homepage',
        async () => {
          return await enqueueScraperJob(
            website,
            enrichmentId,
            false,
            userPlaceId,
          )
        },
      )
    } catch (error) {
      scrapeError =
        error instanceof Error ? error.message : 'Failed to scrape website'
      logger.warn({
        msg: 'Homepage scraping failed, will use fallback',
        event: 'homepage_scrape_failed',
        metadata: { website, userPlaceId, error: scrapeError },
      })
    }

    if (!scrapeResult) {
      logger.error({
        msg: 'Failed to scrape website',
        event: 'failed_to_scrape_website',
        metadata: { website, userPlaceId },
      })

      await setCompanyEnrichmentStatus(
        userPlaceId,
        'processing',
        'Using alternative data sources',
        30,
      )

      // Fallback to governmental data + WHOIS
      const [governmentalDataResult, whoisData] = await Promise.all([
        enrichmentTracker.trackSubprocess('governmental_data', async () => {
          const place = await db.query.place.findFirst({
            where: (place, { eq }) => eq(place.id, placeId),
          })
          if (!place) throw new Error('Place not found')
          return await enrichGovernmentalData({
            place,
            enrichmentId,
            context: { userPlaceId, trackStatus: false },
          })
        }),
        enrichmentTracker.trackSubprocess('whois_lookup', async () => {
          return await performWhoisLookup(domain)
        }),
      ])

      if (governmentalDataResult.companyData) {
        logger.info({
          msg: 'Governmental data found (scraping failed scenario)',
          event: 'governmental_data_found_scraping_failed',
          metadata: { governmentalDataResult },
        })
      }

      // Create contacts even if scraping failed
      await setCompanyEnrichmentStatus(
        userPlaceId,
        'processing',
        'Creating contacts from officers',
        80,
      )

      await enrichmentTracker.trackSubprocess('populate_contacts', async () => {
        return await populateContactFromEnrichment({
          enrichmentId,
          userPlaceId,
        })
      })

      const errorMessage = scrapeError || 'Failed to scrape website'

      await db
        .update(enrichmentTable)
        .set({
          error: errorMessage,
          success: false,
          companyStatus: 'failed',
          domainRegisteredAt: whoisData?.registrationDate
            ? new Date(whoisData.registrationDate)
            : null,
        })
        .where(eq(enrichmentTable.id, enrichmentId))

      await setCompanyEnrichmentStatus(
        userPlaceId,
        'failed',
        'Website scraping failed',
        100,
        errorMessage,
      )

      enrichmentTracker.markFailure(new Error(errorMessage))

      return {
        success: false,
        alreadyEnriched: false,
        data: null,
      }
    }

    // Step 5: Analyze homepage and scrape subpages (30-55%)
    await setCompanyEnrichmentStatus(
      userPlaceId,
      'processing',
      'Analyzing homepage content',
      30,
    )

    const { metadata, links } = scrapeResult

    // Determine crawl strategy
    await setCompanyEnrichmentStatus(
      userPlaceId,
      'processing',
      'Identifying key pages to scan',
      32,
    )

    let crawlStrategy = links.internal

    if (links.internal.length > 5) {
      const businessName = await getBusinessName(userPlaceId)
      crawlStrategy = await getCrawlStrategy(
        links.internal,
        businessName ?? domain,
      )
    }

    // Scrape subpages
    await setCompanyEnrichmentStatus(
      userPlaceId,
      'processing',
      `Scanning ${crawlStrategy.length} additional pages`,
      35,
    )

    let completedPages = 0
    const totalPages = crawlStrategy.length

    // Process subpages in batches to prevent memory accumulation
    // Unbounded Promise.allSettled() was causing all results to be held in memory simultaneously
    const SUBPAGE_BATCH_SIZE = 5
    const subpageResults: PromiseSettledResult<
      Awaited<ReturnType<typeof enqueueScraperJob>>
    >[] = []

    await enrichmentTracker.trackSubprocess('scrape_subpages', async () => {
      for (let i = 0; i < crawlStrategy.length; i += SUBPAGE_BATCH_SIZE) {
        const batch = crawlStrategy.slice(i, i + SUBPAGE_BATCH_SIZE)

        const batchResults = await Promise.allSettled(
          batch.map(async (url: string) => {
            const result = await enqueueScraperJob(
              url,
              enrichmentId,
              false,
              userPlaceId,
            )

            completedPages++

            // Update progress every 20% or at milestones
            if (
              completedPages % Math.max(1, Math.floor(totalPages / 5)) === 0 ||
              completedPages === totalPages ||
              completedPages === 1
            ) {
              const progressPercent =
                35 + Math.round((completedPages / totalPages) * 20)
              await setCompanyEnrichmentStatus(
                userPlaceId,
                'processing',
                `Scanned ${completedPages}/${totalPages} pages`,
                progressPercent,
              )
            }

            return result
          }),
        )

        subpageResults.push(...batchResults)
      }
    })

    const successfulSubpages = subpageResults.filter(
      (result): result is PromiseFulfilledResult<unknown> =>
        result.status === 'fulfilled' && result.value != null,
    ).length

    logger.info({
      msg: 'Subpage scraping completed',
      event: 'subpage_scraping_completed',
      metadata: {
        totalSubpages: crawlStrategy.length,
        successfulSubpages,
        failedSubpages: subpageResults.length - successfulSubpages,
        userPlaceId,
      },
    })

    // Step 6: External data enrichment (55-75%)
    await setCompanyEnrichmentStatus(
      userPlaceId,
      'processing',
      'Searching governmental databases',
      58,
    )

    const [
      governmentalDataResult,
      { description, shortDescription },
      whoisData,
    ] = await Promise.all([
      enrichmentTracker.trackSubprocess('governmental_data', async () => {
        const place = await db.query.place.findFirst({
          where: (place, { eq }) => eq(place.id, placeId),
        })
        if (!place) throw new Error('Place not found')
        return await enrichGovernmentalData({
          place,
          enrichmentId,
          context: { userPlaceId, trackStatus: false },
        })
      }),
      enrichmentTracker.trackSubprocess('website_description', async () => {
        return await getWebsiteDescription(domain)
      }),
      enrichmentTracker.trackSubprocess('whois_lookup', async () => {
        return await performWhoisLookup(domain)
      }),
    ])

    if (governmentalDataResult.companyData) {
      await setCompanyEnrichmentStatus(
        userPlaceId,
        'processing',
        'Processing official company data',
        70,
      )

      logger.info({
        msg: 'Governmental data found',
        event: 'governmental_data_found',
        metadata: {
          companyName: governmentalDataResult.companyData.name,
          companyNumber: governmentalDataResult.companyData.company_number,
          userPlaceId,
        },
      })
    }

    // Step 7: Create contacts from officers (75-90%)
    await setCompanyEnrichmentStatus(
      userPlaceId,
      'processing',
      'Creating contacts from officers',
      78,
    )

    await enrichmentTracker.trackSubprocess('populate_contacts', async () => {
      return await populateContactFromEnrichment({
        enrichmentId,
        userPlaceId,
      })
    })

    // Step 8: Calculate score and finalize (90-100%)
    await setCompanyEnrichmentStatus(
      userPlaceId,
      'processing',
      'Calculating enrichment quality',
      92,
    )

    const enrichmentScore = await enrichmentTracker.trackSubprocess(
      'calculate_score',
      async () => calculateEnrichmentScore(enrichmentId),
    )

    await setCompanyEnrichmentStatus(
      userPlaceId,
      'processing',
      'Saving enrichment results',
      96,
    )

    await db
      .update(enrichmentTable)
      .set({
        title: metadata.title,
        description,
        shortDescription,
        language: metadata.language,
        keywords: metadata.keywords,
        favicon: metadata.favicon,
        robots: metadata.robots,
        isStale: false,
        score: enrichmentScore,
        success: true,
        companyStatus: 'completed',
        companyEnrichedAt: new Date(),
        domainRegisteredAt: whoisData?.registrationDate
          ? new Date(whoisData.registrationDate)
          : null,
      })
      .where(eq(enrichmentTable.id, enrichmentId))

    await setCompanyEnrichmentStatus(
      userPlaceId,
      'completed',
      'Company enrichment completed',
      100,
    )

    enrichmentTracker.markSuccess()

    const duration = Date.now() - startTime

    logger.info({
      msg: `Company enrichment completed in ${duration / 1000} seconds`,
      event: 'company_enrichment_service_completed',
      metadata: {
        userPlaceId,
        enrichmentId,
        duration,
        subpageStats: {
          total: crawlStrategy.length,
          successful: successfulSubpages,
          failed: subpageResults.length - successfulSubpages,
        },
      },
    })

    const data = await getFullCompanyEnrichmentData(userPlaceId)
    if (data) {
      data.creditsUsed = COMPANY_CREDITS
    }
    return {
      success: true,
      alreadyEnriched: false,
      data,
    }
  } catch (error) {
    const errorMessage = extractErrorMessage(error)

    await setCompanyEnrichmentStatus(
      userPlaceId,
      'failed',
      errorMessage || 'Company enrichment failed',
      100,
      errorMessage,
    )

    enrichmentTracker.markFailure(
      error instanceof Error ? error : new Error(errorMessage),
    )

    logger.error({
      msg: 'Error in company enrichment service',
      event: 'company_enrichment_service_error',
      metadata: {
        userPlaceId,
        enrichmentId,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack:
                  process.env.NODE_ENV === 'development'
                    ? error.stack
                    : undefined,
              }
            : { message: errorMessage, raw: error },
        timestamp: new Date().toISOString(),
      },
    })

    // If error is due to credit issues, don't refund
    if (
      errorMessage === INSUFFICIENT_CREDITS_ERROR ||
      errorMessage === USER_CREDITS_NOT_FOUND_ERROR
    ) {
      logger.info({
        msg: 'No enrichment credits available',
        event: 'company_enrichment_no_credits',
        metadata: { userId },
      })
      throw new UnrecoverableError(errorMessage)
    }

    // Refund credits on failure
    await refundCredits(userId, COMPANY_CREDITS)

    // Update enrichment record
    await db
      .update(enrichmentTable)
      .set({
        error: errorMessage,
        success: false,
        companyStatus: 'failed',
      })
      .where(eq(enrichmentTable.id, enrichmentId))

    throw new UnrecoverableError(errorMessage)
  }
}
