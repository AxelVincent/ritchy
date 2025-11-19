import { logger } from '@ritchy/logger'
import { getMainDomain } from './scraper/utils/get_main_domain'
import { isSubPage } from './utils/is_sub_page'

import { eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { enrichment as enrichmentTable } from '../../db/schema'
import { getCrawlStrategy } from '../../external/langchain/get_crawl_strategy'
import { getPlaceByUserPlaceId } from '../places/queries/get_place_by_user_place_id'
import { getBusinessName } from './queries/get_business_name'

import { UnrecoverableError } from 'bullmq'
import { getWebsiteDescription } from '../../external/langchain/get_website_description'
import { deleteWebsiteVectors } from '../../external/qdrant/queries/delete_website_vectors'
import { getWebsiteVectors } from '../../external/qdrant/queries/get_website_vectors'
import { performWhoisLookup } from '../../external/whois/who_is_lookup'
import { enqueueScraperJob } from '../../internal/bullmq/jobs/scraper/queue'
import { populateContactFromEnrichment } from '../contact/populate_contact_from_enrichment'
import {
  INSUFFICIENT_CREDITS_ERROR,
  USER_CREDITS_NOT_FOUND_ERROR,
  consumeCredits,
} from '../payment/queries/consume_credits'
import { refundCredits } from '../payment/queries/refund_credits'
import { getUserIdByUserPlaceId } from '../places/queries/get_user_id_by_user_place_id'
import { enrichGovernmentalData } from './governmental_data/enrich_governmental_data'
import { processSocialMediaDomain } from './process_social_media_domain'
import { getBusinessWebsite } from './queries/get_business_website'
import { setUserPlaceAsEnriched } from './queries/set_user_place_as_enriched'
import { EnrichmentStatusBuilder } from './status_builder'
import { calculateEnrichmentScore } from './utils/calculate_enrichment_score'
import { isSocialMediaUrl } from './utils/is_social_media_url'

const ENRICHMENT_CREDITS = 5

const simulateProcessingTime = async () => {
  const min = 1000
  const max = 3000
  await new Promise((resolve) =>
    setTimeout(resolve, Math.floor(min + Math.random() * (max - min))),
  )
}

export const websiteEnrichmentManager = async ({
  userPlaceId,
}: {
  userPlaceId: string
}) => {
  const startTime = Date.now()
  const memoryUsage = process.memoryUsage()
  logger.info({
    msg: 'Starting website enrichment manager',
    event: 'website_enrichment_manager_start',
    metadata: {
      userPlaceId,
      memoryUsage: {
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      },
    },
  })

  const statusManager = new EnrichmentStatusBuilder(userPlaceId)
  let insertedEnrichment:
    | {
        id: string
        placeId: string
        domain: string | null
        success: boolean
      }
    | undefined

  // Step 1: Initialize (0-2%)
  await statusManager.startPhase('initialization')

  // Step 2: Fetch data (2-5%)
  await statusManager.updatePhaseProgress(
    'initialization',
    50,
    'Fetching business information',
  )

  const [userId, place] = await Promise.all([
    getUserIdByUserPlaceId(userPlaceId),
    getPlaceByUserPlaceId(userPlaceId),
  ])

  if (!userId || !place) {
    logger.error({
      msg: 'User or place not found',
      event: 'user_or_place_not_found',
      metadata: { userPlaceId },
    })
    return
  }

  try {
    // Step 3: Credit validation (5-8%)
    await statusManager.updatePhaseProgress(
      'initialization',
      100,
      'Processing enrichment request',
    )
    await Promise.all([
      consumeCredits(userId, ENRICHMENT_CREDITS),
      setUserPlaceAsEnriched(userPlaceId),
    ])

    // Step 4: Check existing enrichment (8-10%)
    await statusManager.startPhase('website_scan')
    await statusManager.updatePhaseProgress(
      'website_scan',
      2,
      'Verifying business details',
    )

    const [existingEnrichment] = await db
      .select()
      .from(enrichmentTable)
      .where(eq(enrichmentTable.placeId, place.id))
      .limit(1)

    if (existingEnrichment?.success) {
      if (!existingEnrichment.isStale) {
        // Simulate processing steps even though using cached data
        const domain = existingEnrichment.domain || 'website'

        await statusManager.setStatus(
          'processing',
          'Preparing website scanner',
          14,
        )
        await simulateProcessingTime()

        await statusManager.setStatus(
          'processing',
          `Scanning homepage: ${domain}`,
          16,
        )
        await simulateProcessingTime()

        await statusManager.setStatus(
          'processing',
          'Analyzing homepage content',
          25,
        )
        await simulateProcessingTime()

        await statusManager.setStatus(
          'processing',
          'Identifying key pages to scan',
          26,
        )
        await simulateProcessingTime()

        // Simulate some pages being scanned
        const simulatedPageCount = Math.floor(Math.random() * 5) + 3 // 3-7 pages
        await statusManager.setStatus(
          'processing',
          `Starting scan of ${simulatedPageCount} additional pages`,
          28,
        )
        await simulateProcessingTime()

        // Simulate scanning completion
        await statusManager.setStatus(
          'processing',
          `Completed ${simulatedPageCount}/${simulatedPageCount} pages successfully`,
          75,
        )
        await simulateProcessingTime()

        await statusManager.setStatus(
          'processing',
          'Searching governmental databases',
          85,
        )
        await simulateProcessingTime()

        await statusManager.setStatus(
          'processing',
          'Compiling business data',
          95,
        )
        await simulateProcessingTime()

        await statusManager.setStatus(
          'processing',
          'Saving enrichment results',
          98,
        )
        await simulateProcessingTime()

        await statusManager.setStatus(
          'processing',
          'Generating contact information',
          99,
        )

        await populateContactFromEnrichment({
          enrichmentId: existingEnrichment.id,
          userPlaceId,
        })

        await statusManager.complete('Enrichment completed successfully')

        logger.info({
          msg: 'Website already enriched, skipping enrichment',
          event: 'website_already_enriched',
          metadata: {
            website: existingEnrichment.domain,
            userPlaceId,
            timeToEnrich: Date.now() - startTime,
          },
        })
        return
      }

      // Stale data - show as updating
      await statusManager.setStatus(
        'processing',
        'Updating business information',
        9,
      )

      logger.info({
        msg: 'Refreshing stale enrichment',
        event: 'stale_enrichment_refresh_start',
        metadata: {
          enrichmentId: existingEnrichment.id,
          domain: existingEnrichment.domain,
          userPlaceId,
        },
      })

      await db
        .update(enrichmentTable)
        .set({
          isStale: false,
          success: true,
          error: null,
          updatedAt: new Date(),
        })
        .where(eq(enrichmentTable.id, existingEnrichment.id))
    }

    // Step 5: Extract website (10%)
    await statusManager.setStatus(
      'processing',
      'Extracting business website',
      10,
    )

    const website = await getBusinessWebsite(userPlaceId)

    if (!website) {
      await statusManager.setStatus(
        'processing',
        'No website found, using alternative sources',
        15,
      )
      ;[insertedEnrichment] = await db
        .insert(enrichmentTable)
        .values({
          placeId: place.id,
          domain: null,
          domainRegisteredAt: null,
          success: true,
        })
        .onConflictDoUpdate({
          target: [enrichmentTable.placeId],
          set: {
            placeId: place.id,
            domain: null,
            success: true,
            domainRegisteredAt: null,
          },
        })
        .returning()

      await statusManager.setStatus(
        'processing',
        'Searching governmental databases',
        60,
      )

      const governmentalDataResult = await enrichGovernmentalData({
        place: place,
        enrichmentId: insertedEnrichment.id,
        context: { userPlaceId, trackStatus: true },
      })

      if (governmentalDataResult.companyData) {
        logger.info({
          msg: '[pappers] Governmental data found (no website scenario)',
          event: 'governmental_data_found_no_website',
          metadata: { governmentalDataResult },
        })
      }

      logger.error({
        msg: 'Website not found, skipping enrichment',
        event: 'website_not_found',
        metadata: { userPlaceId, timeToEnrich: Date.now() - startTime },
      })
      return
    }

    // Step 6: Validate domain (11-12%)
    await statusManager.setStatus('processing', 'Validating website domain', 11)

    const domain = getMainDomain(website)

    await statusManager.setStatus(
      'processing',
      'Preparing website analysis',
      12,
    )
    ;[insertedEnrichment] = await db
      .insert(enrichmentTable)
      .values({
        placeId: place.id,
        domain,
        success: true,
      })
      .onConflictDoUpdate({
        target: [enrichmentTable.placeId],
        set: {
          placeId: place.id,
          domain,
          success: true,
        },
      })
      .returning()

    // Handle social media (quick path)
    if (isSocialMediaUrl(website)) {
      await statusManager.setStatus(
        'processing',
        `Analyzing social profile: ${website}`,
        20,
      )

      await processSocialMediaDomain({
        enrichmentId: insertedEnrichment.id,
        website,
      })

      await statusManager.setStatus(
        'processing',
        'Generating contact information',
        90,
      )

      await statusManager.setStatus('processing', 'Finalizing enrichment', 95)

      await populateContactFromEnrichment({
        enrichmentId: insertedEnrichment.id,
        userPlaceId,
      })

      await statusManager.complete('Enrichment completed successfully')

      logger.info({
        msg: 'Website enrichment manager completed [social media]',
        event: 'website_enrichment_manager_completed',
        metadata: { website, timeToEnrich: Date.now() - startTime },
      })
      return
    }

    // Check if subpage
    if (isSubPage(website)) {
      await statusManager.setStatus(
        'processing',
        'Optimizing scraping strategy',
        13,
      )
      logger.debug({
        msg: 'Website is a subpage',
        event: 'website_is_subpage',
        metadata: { website },
      })
    }

    // Step 7: Prepare scraping (13-15%)
    await statusManager.setStatus('processing', 'Preparing website scanner', 14)

    logger.debug({
      msg: 'Getting website vectors',
      event: 'getting_website_vectors',
      metadata: { domain, userPlaceId },
    })

    const websiteVectors = await getWebsiteVectors(domain)

    if (websiteVectors.length > 0) {
      await statusManager.setStatus('processing', 'Initializing fresh scan', 15)

      logger.debug({
        msg: 'Website already exists in qdrant, deleting vectors before scraping',
        event: 'website_already_exists_in_qdrant',
        metadata: { website },
      })
      await deleteWebsiteVectors(domain)
    }

    // Step 8: SCRAPE HOMEPAGE (15-25%) - TIME INTENSIVE
    await statusManager.setStatus(
      'processing',
      `Scanning homepage: ${website}`,
      16,
    )

    logger.debug({
      msg: 'Scraping main page of the website',
      event: 'scraping_main_page_of_the_website',
      metadata: { website, userPlaceId },
    })

    const scrapeResult = await enqueueScraperJob(
      website,
      insertedEnrichment.id,
      false,
      userPlaceId,
    )

    if (!scrapeResult || 'error' in scrapeResult) {
      logger.error({
        msg: 'Failed to scrape website',
        event: 'failed_to_scrape_website',
        metadata: { website, userPlaceId },
      })

      await statusManager.setStatus(
        'processing',
        'Using alternative data sources',
        30,
      )

      await statusManager.setStatus(
        'processing',
        'Searching governmental databases',
        60,
      )

      const [governmentalDataResult, whoisData] = await Promise.all([
        enrichGovernmentalData({
          place: place,
          enrichmentId: insertedEnrichment.id,
          context: { userPlaceId, trackStatus: true },
        }),
        performWhoisLookup(domain),
      ])

      if (governmentalDataResult.companyData) {
        logger.info({
          msg: '[pappers] Governmental data found (scraping failed scenario)',
          event: 'governmental_data_found_scraping_failed',
          metadata: { governmentalDataResult },
        })
      }

      await db
        .update(enrichmentTable)
        .set({
          error: scrapeResult?.error?.message || 'Failed to scrape website',
          success: false,
          domainRegisteredAt: whoisData?.registrationDate
            ? new Date(whoisData.registrationDate)
            : null,
        })
        .where(eq(enrichmentTable.id, insertedEnrichment.id))
      return
    }

    // Step 9: Analyze homepage (25%)
    await statusManager.setStatus(
      'processing',
      'Analyzing homepage content',
      25,
    )

    const { metadata, links } = scrapeResult

    // Step 10: Determine crawl strategy (26-27%)
    await statusManager.setStatus(
      'processing',
      'Identifying key pages to scan',
      26,
    )

    let crawlStrategy = links.internal

    if (links.internal.length > 10) {
      const businessName = await getBusinessName(userPlaceId)

      await statusManager.setStatus(
        'processing',
        'Selecting most relevant pages',
        27,
      )

      crawlStrategy = await getCrawlStrategy(
        links.internal,
        businessName ?? domain,
      )

      logger.debug({
        msg: 'Website has too many internal links',
        event: 'website_has_too_many_internal_links',
        metadata: {
          website,
          crawlStrategyLength: crawlStrategy.length,
          userPlaceId,
        },
      })
    }

    await statusManager.updatePhaseProgress(
      'website_scan',
      10,
      `Starting scan of ${crawlStrategy.length} additional pages`,
    )

    let completedPages = 0
    const totalPages = crawlStrategy.length
    const subpageResults = await Promise.allSettled(
      crawlStrategy.map(async (url: string) => {
        if (!insertedEnrichment) {
          throw new Error('Enrichment record not initialized')
        }

        try {
          const result = await enqueueScraperJob(
            url,
            insertedEnrichment.id,
            false,
            userPlaceId,
          )

          completedPages++

          // Update progress based on COMPLETED pages (not started pages)
          // This ensures progress only increases, never decreases
          const phaseProgressPercent = (completedPages / totalPages) * 100

          // Show progress update every 20% or at milestones
          if (
            completedPages % Math.max(1, Math.floor(totalPages / 5)) === 0 ||
            completedPages === totalPages ||
            completedPages === 1 // Show first completion
          ) {
            await statusManager.updatePhaseProgress(
              'website_scan',
              phaseProgressPercent,
              `Scanned ${completedPages}/${totalPages} pages`,
            )
          }

          return result
        } catch (error) {
          logger.warn({
            msg: `Failed to scrape subpage: ${url}`,
            event: 'subpage_scrape_failed',
            metadata: {
              url,
              userPlaceId,
              enrichmentId: insertedEnrichment.id,
              error: error instanceof Error ? error.message : String(error),
            },
          })

          completedPages++

          return {
            error: error instanceof Error ? error.message : String(error),
          }
        }
      }),
    )

    const successfulSubpages = subpageResults.filter(
      (result) => result.status === 'fulfilled' && !('error' in result.value),
    ).length
    const failedSubpages = subpageResults.length - successfulSubpages

    await statusManager.updatePhaseProgress(
      'website_scan',
      100,
      `Completed ${successfulSubpages}/${totalPages} pages successfully`,
    )

    logger.info({
      msg: 'Subpage scraping completed',
      event: 'subpage_scraping_completed',
      metadata: {
        totalSubpages: crawlStrategy.length,
        successfulSubpages,
        failedSubpages,
        userPlaceId,
      },
    })

    logger.info({
      msg: 'Scraped website',
      event: 'scraped_website',
      metadata: {
        internal: links.internal,
        userPlaceId,
      },
    })

    // Step 12: External data enrichment (company_search phase)
    await statusManager.startPhase('company_search')
    await statusManager.updatePhaseProgress(
      'company_search',
      50,
      'Searching governmental databases',
    )

    const [
      governmentalDataResult,
      { description, shortDescription },
      whoisData,
    ] = await Promise.all([
      enrichGovernmentalData({
        place: place,
        enrichmentId: insertedEnrichment.id,
        context: { userPlaceId, trackStatus: true },
      }),
      getWebsiteDescription(domain),
      performWhoisLookup(domain),
    ])

    if (governmentalDataResult.companyData) {
      await statusManager.updatePhaseProgress(
        'company_search',
        100,
        'Processing official company data',
      )

      logger.info({
        msg: '[pappers] Governmental data found (scraping successful scenario)',
        event: 'governmental_data_found_scraping_successful',
        metadata: {
          companyName: governmentalDataResult.companyData.name,
          companyNumber: governmentalDataResult.companyData.company_number,
          userPlaceId,
        },
      })
    } else {
      await statusManager.updatePhaseProgress(
        'company_search',
        100,
        'Completed company search',
      )
    }

    // Step 13: Compile and save (finalization phase)
    await statusManager.startPhase('finalization')
    await statusManager.updatePhaseProgress(
      'finalization',
      25,
      'Compiling business data',
    )

    await statusManager.updatePhaseProgress(
      'finalization',
      60,
      'Saving enrichment results',
    )

    await statusManager.updatePhaseProgress(
      'finalization',
      90,
      'Generating contact information',
    )

    // Populate contacts first (needed for accurate score calculation)
    await populateContactFromEnrichment({
      enrichmentId: insertedEnrichment.id,
      userPlaceId,
    })

    // Calculate enrichment quality score
    const enrichmentScore = await calculateEnrichmentScore(
      insertedEnrichment.id,
    )

    // Save enrichment data and score
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
        domainRegisteredAt: whoisData?.registrationDate
          ? new Date(whoisData.registrationDate)
          : null,
      })
      .where(eq(enrichmentTable.id, insertedEnrichment.id))

    await statusManager.complete('Enrichment completed successfully')

    const endTime = Date.now()
    const duration = endTime - startTime
    logger.info({
      msg: `Website enrichment manager completed [regular website] in ${duration / 1000} seconds`,
      event: 'website_enrichment_manager_completed',
      metadata: {
        userPlaceId,
        duration,
        subpageStats: {
          total: crawlStrategy.length,
          successful: successfulSubpages,
          failed: failedSubpages,
        },
      },
    })

    return {
      success: true,
      message: 'Website enriched successfully',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    await statusManager.fail(errorMessage || 'Enrichment failed')

    logger.error({
      msg: 'Error enriching website',
      event: 'error_enriching_website',
      metadata: {
        userPlaceId,
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
            : error,
        timestamp: new Date().toISOString(),
      },
    })

    // If the error is because of no enrichment credits available, we don't need to refund the credit
    if (
      error instanceof Error &&
      (error.message === INSUFFICIENT_CREDITS_ERROR ||
        error.message === USER_CREDITS_NOT_FOUND_ERROR)
    ) {
      logger.info({
        msg: 'No enrichment credits available',
        event: 'consume_enrichment_credit_no_credits',
        metadata: { userId },
      })
      throw new UnrecoverableError(errorMessage)
    }

    // Only update enrichment record if we have an insertedEnrichment
    await refundCredits(userId, ENRICHMENT_CREDITS)

    if (insertedEnrichment) {
      await db
        .update(enrichmentTable)
        .set({
          error: errorMessage,
          success: false,
        })
        .where(eq(enrichmentTable.id, insertedEnrichment.id))
    }

    throw new UnrecoverableError(errorMessage)
  }
}
