import { logger } from '@ritchy/logger'
import { getMainDomain } from './scraper/utils/get_main_domain'
import { isSubPage } from './utils/is_sub_page'

import { eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { enrichment, enrichment as enrichmentTable } from '../../db/schema'
import { getCrawlStrategy } from '../../external/langchain/get_crawl_strategy'
import { getBusinessName } from './queries/get_business_name'
import { getPlaceByUserPlaceId } from './queries/get_place_by_user_place_id'

import { UnrecoverableError } from 'bullmq'
import { getWebsiteDescription } from '../../external/langchain/get_website_description'
import { deleteWebsiteVectors } from '../../external/qdrant/queries/delete_website_vectors'
import { getWebsiteVectors } from '../../external/qdrant/queries/get_website_vectors'
import { performWhoisLookup } from '../../external/whois/who_is_lookup'
import { enqueueScraperJob } from '../../internal/bullmq/jobs/scraper/queue'
import { jobTracker } from '../../internal/bullmq/utils/job_progress_tracker'
import { populateContactFromEnrichment } from '../contact/populate_contact_from_enrichment'
import {
  INSUFFICIENT_CREDITS_ERROR,
  USER_CREDITS_NOT_FOUND_ERROR,
  consumeCredits,
} from '../payment/queries/consume_credits'
import { refundCredits } from '../payment/queries/refund_credits'
import { getUserIdByUserPlaceId } from '../places/queries/get_user_id_by_user_place_id'
import { governmentalData } from './governmental_data'
import { processSocialMediaDomain } from './process_social_media_domain'
import { getBusinessWebsite } from './queries/get_business_website'
import { setUserPlaceAsEnriched } from './queries/set_user_place_as_enriched'
import { setEnrichmentStatus } from './status_manager'
import { isSocialMediaUrl } from './utils/is_social_media_url'

const ENRICHMENT_CREDITS = 5
export const websiteEnrichmentManager = async ({
  userPlaceId,
  jobId,
}: {
  userPlaceId: string
  jobId: string
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

  await setEnrichmentStatus(
    userPlaceId,
    'processing',
    'Fetching user and place data',
    5,
    jobId,
  )
  jobTracker.updateProgress(jobId, 'Fetching user and place data')
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
    // TODO : We should improve the frontend to let the user know that the place is already enriched
    // This way it will know that the place is already enriched and will not consume credits
    // Or it will enrich on purpose
    if (place.user_place.enriched_at !== null) {
      await setEnrichmentStatus(
        userPlaceId,
        'processing',
        'Consuming enrichment credits',
        10,
        jobId,
      )
      jobTracker.updateProgress(jobId, 'Consuming enrichment credits')
      await consumeCredits(userId, ENRICHMENT_CREDITS)
    }

    await setEnrichmentStatus(
      userPlaceId,
      'processing',
      'Checking existing enrichment',
      15,
      jobId,
    )
    jobTracker.updateProgress(jobId, 'Checking existing enrichment')
    const [existingEnrichment] = await db
      .select()
      .from(enrichmentTable)
      .where(eq(enrichmentTable.placeId, place.place.id))
      .limit(1)

    if (existingEnrichment?.success) {
      if (!existingEnrichment.isStale) {
        await setEnrichmentStatus(
          userPlaceId,
          'processing',
          'Using existing enrichment',
          95,
          jobId,
        )
        jobTracker.updateProgress(jobId, 'Using existing enrichment')
        await Promise.all([
          populateContactFromEnrichment({
            enrichmentId: existingEnrichment.id,
            userPlaceId,
          }),
          setUserPlaceAsEnriched(userPlaceId),
        ])
        await setEnrichmentStatus(
          userPlaceId,
          'completed',
          'Enrichment completed',
          100,
          jobId,
        )
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

      jobTracker.updateProgress(jobId, 'Refreshing stale enrichment data')
      logger.info({
        msg: 'Refreshing stale enrichment',
        event: 'stale_enrichment_refresh_start',
        metadata: {
          enrichmentId: enrichment.id,
          domain: enrichment.domain,
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

    await setEnrichmentStatus(
      userPlaceId,
      'processing',
      'Getting business website',
      20,
      jobId,
    )
    jobTracker.updateProgress(jobId, 'Getting business website')
    const website = await getBusinessWebsite(userPlaceId)
    if (!website) {
      const [insertedEnrichment] = await db
        .insert(enrichmentTable)
        .values({
          placeId: place.place.id,
          domain: null,
          domainRegisteredAt: null,
        })
        .onConflictDoUpdate({
          target: [enrichmentTable.placeId],
          set: {
            placeId: place.place.id,
            domain: null,
            success: true,
            domainRegisteredAt: null,
          },
        })
        .returning()

      // Run governmental data when no website is provided
      await setEnrichmentStatus(
        userPlaceId,
        'processing',
        'Enriching with governmental data',
        50,
        jobId,
      )
      jobTracker.updateProgress(
        jobId,
        'Enriching with governmental data (no website)',
      )
      const governmentalDataResult = await governmentalData({
        place: place.place,
        enrichmentId: insertedEnrichment.id,
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

    await setEnrichmentStatus(
      userPlaceId,
      'processing',
      'Scraping main page',
      30,
      jobId,
    )
    jobTracker.updateProgress(jobId, 'Scraping main page')
    const domain = getMainDomain(website)
    const [insertedEnrichment] = await db
      .insert(enrichmentTable)
      .values({
        placeId: place.place.id,
        domain,
      })
      .onConflictDoUpdate({
        target: [enrichmentTable.placeId],
        set: {
          placeId: place.place.id,
          domain,
        },
      })
      .returning()

    if (isSocialMediaUrl(website)) {
      await processSocialMediaDomain({
        enrichmentId: insertedEnrichment.id,
        website,
      })
      await populateContactFromEnrichment({
        enrichmentId: insertedEnrichment.id,
        userPlaceId,
      })
      logger.info({
        msg: 'Website enrichment manager completed [social media]',
        event: 'website_enrichment_manager_completed',
        metadata: { website, timeToEnrich: Date.now() - startTime },
      })
      return
    }

    // TODO: check if the website is a subpage
    // if it is, we need :
    // - to avoid main platform where useless data could be found
    // - to scrape only the subpage
    if (isSubPage(website)) {
      logger.debug({
        msg: 'Website is a subpage',
        event: 'website_is_subpage',
        metadata: { website },
      })
    }

    logger.debug({
      msg: 'Getting website vectors',
      event: 'getting_website_vectors',
      metadata: { domain, userPlaceId },
    })
    const websiteVectors = await getWebsiteVectors(domain)
    if (websiteVectors.length > 0) {
      logger.debug({
        msg: 'Website already exists in qdrant, deleting vectors before scraping',
        event: 'website_already_exists_in_qdrant',
        metadata: {
          website,
        },
      })
      await deleteWebsiteVectors(domain)
    }

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

      // Run governmental data as fallback when scraping fails
      await setEnrichmentStatus(
        userPlaceId,
        'processing',
        'Enriching with governmental data',
        60,
        jobId,
      )
      jobTracker.updateProgress(
        jobId,
        'Enriching with governmental data (scraping failed)',
      )
      const [governmentalDataResult, whoisData] = await Promise.all([
        governmentalData({
          place: place.place,
          enrichmentId: insertedEnrichment.id,
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

    await setEnrichmentStatus(
      userPlaceId,
      'processing',
      'Processing subpages',
      50,
      jobId,
    )
    jobTracker.updateProgress(jobId, 'Processing subpages')
    const { metadata, links } = scrapeResult
    let crawlStrategy = links.internal
    if (links.internal.length > 10) {
      const businessName = await getBusinessName(userPlaceId)
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

    // Handle subpage scraping with better error handling
    const subpageResults = await Promise.allSettled(
      crawlStrategy.map(async (url: string) => {
        try {
          return await enqueueScraperJob(
            url,
            insertedEnrichment.id,
            true,
            userPlaceId,
          )
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
          return {
            error: error instanceof Error ? error.message : String(error),
          }
        }
      }),
    )

    // Count successful vs failed subpage scrapes
    const successfulSubpages = subpageResults.filter(
      (result) => result.status === 'fulfilled' && !('error' in result.value),
    ).length
    const failedSubpages = subpageResults.length - successfulSubpages

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

    // Run governmental data when scraping is successful
    await setEnrichmentStatus(
      userPlaceId,
      'processing',
      'Enriching with external data',
      70,
      jobId,
    )
    jobTracker.updateProgress(jobId, 'Enriching with external data')

    const [
      governmentalDataResult,
      { description, shortDescription },
      whoisData,
    ] = await Promise.all([
      governmentalData({
        place: place.place,
        enrichmentId: insertedEnrichment.id,
      }),
      getWebsiteDescription(domain),
      performWhoisLookup(domain),
    ])

    if (governmentalDataResult.companyData) {
      logger.info({
        msg: '[pappers] Governmental data found (scraping successful scenario)',
        event: 'governmental_data_found_scraping_successful',
        metadata: { governmentalDataResult },
      })
    }

    await setEnrichmentStatus(
      userPlaceId,
      'processing',
      'Updating enrichment',
      90,
      jobId,
    )
    jobTracker.updateProgress(jobId, 'Updating enrichment')
    await Promise.all([
      db
        .update(enrichmentTable)
        .set({
          title: metadata.title,
          description,
          shortDescription,
          language: metadata.language,
          keywords: metadata.keywords,
          favicon: metadata.favicon,
          robots: metadata.robots,
          success: true,
          domainRegisteredAt: whoisData?.registrationDate
            ? new Date(whoisData.registrationDate)
            : null,
        })
        .where(eq(enrichmentTable.id, insertedEnrichment.id)),
      populateContactFromEnrichment({
        enrichmentId: insertedEnrichment.id,
        userPlaceId,
      }),
      setUserPlaceAsEnriched(userPlaceId),
    ])

    await setEnrichmentStatus(
      userPlaceId,
      'completed',
      'Enrichment completed',
      100,
      jobId,
    )
    jobTracker.updateProgress(jobId, 'Enrichment completed')
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
    await setEnrichmentStatus(
      userPlaceId,
      'failed',
      'Enrichment failed',
      100,
      jobId,
      errorMessage,
    )
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
    const updatePromises = [
      refundCredits(userId, ENRICHMENT_CREDITS),
      setUserPlaceAsEnriched(userPlaceId),
      db
        .update(enrichmentTable)
        .set({
          error: errorMessage,
          success: false,
        })
        .where(eq(enrichmentTable.id, enrichment.id)),
    ]

    await Promise.all(updatePromises)

    throw new UnrecoverableError(errorMessage)
  }
}
