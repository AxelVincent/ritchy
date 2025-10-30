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

  // Step 1: Initialize (0-2%)
  await setEnrichmentStatus(
    userPlaceId,
    'processing',
    'Initializing enrichment process',
    1,
    jobId,
  )
  jobTracker.updateProgress(jobId, 'Initializing enrichment process')

  // Step 2: Fetch data (2-5%)
  await setEnrichmentStatus(
    userPlaceId,
    'processing',
    'Fetching business information',
    3,
    jobId,
  )
  jobTracker.updateProgress(jobId, 'Fetching business information')

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
    await setEnrichmentStatus(
      userPlaceId,
      'processing',
      'Processing enrichment request',
      7,
      jobId,
    )
    jobTracker.updateProgress(jobId, 'Validating enrichment credits')
    await Promise.all([
      consumeCredits(userId, ENRICHMENT_CREDITS),
      setUserPlaceAsEnriched(userPlaceId),
    ])

    // Step 4: Check existing enrichment (8-10%)
    await setEnrichmentStatus(
      userPlaceId,
      'processing',
      'Verifying business details',
      8,
      jobId,
    )
    jobTracker.updateProgress(jobId, 'Verifying business details')

    const [existingEnrichment] = await db
      .select()
      .from(enrichmentTable)
      .where(eq(enrichmentTable.placeId, place.place.id))
      .limit(1)

    if (existingEnrichment?.success) {
      if (!existingEnrichment.isStale) {
        // Simulate processing steps even though using cached data
        await setEnrichmentStatus(
          userPlaceId,
          'processing',
          'Extracting website information',
          20,
          jobId,
        )

        await setEnrichmentStatus(
          userPlaceId,
          'processing',
          'Analyzing website content',
          45,
          jobId,
        )

        await setEnrichmentStatus(
          userPlaceId,
          'processing',
          'Searching external databases',
          70,
          jobId,
        )

        await setEnrichmentStatus(
          userPlaceId,
          'processing',
          'Processing company information',
          85,
          jobId,
        )

        await setEnrichmentStatus(
          userPlaceId,
          'processing',
          'Generating contact details',
          93,
          jobId,
        )
        jobTracker.updateProgress(jobId, 'Generating contact details')

        await populateContactFromEnrichment({
          enrichmentId: existingEnrichment.id,
          userPlaceId,
        })

        await setEnrichmentStatus(
          userPlaceId,
          'processing',
          'Finalizing enrichment',
          97,
          jobId,
        )

        await setEnrichmentStatus(
          userPlaceId,
          'completed',
          'Enrichment completed successfully',
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

      // Stale data - show as updating
      await setEnrichmentStatus(
        userPlaceId,
        'processing',
        'Updating business information',
        9,
        jobId,
      )
      jobTracker.updateProgress(jobId, 'Updating business information')

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
    await setEnrichmentStatus(
      userPlaceId,
      'processing',
      'Extracting business website',
      10,
      jobId,
    )
    jobTracker.updateProgress(jobId, 'Extracting business website')

    const website = await getBusinessWebsite(userPlaceId)

    if (!website) {
      await setEnrichmentStatus(
        userPlaceId,
        'processing',
        'No website found, using alternative sources',
        15,
        jobId,
      )

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

      await setEnrichmentStatus(
        userPlaceId,
        'processing',
        'Searching governmental databases',
        60,
        jobId,
      )
      jobTracker.updateProgress(
        jobId,
        'Searching governmental databases (no website)',
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

    // Step 6: Validate domain (11-12%)
    await setEnrichmentStatus(
      userPlaceId,
      'processing',
      'Validating website domain',
      11,
      jobId,
    )
    jobTracker.updateProgress(jobId, 'Validating website domain')

    const domain = getMainDomain(website)

    await setEnrichmentStatus(
      userPlaceId,
      'processing',
      'Preparing website analysis',
      12,
      jobId,
    )

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

    // Handle social media (quick path)
    if (isSocialMediaUrl(website)) {
      await setEnrichmentStatus(
        userPlaceId,
        'processing',
        `Analyzing social profile: ${website}`,
        20,
        jobId,
      )

      await processSocialMediaDomain({
        enrichmentId: insertedEnrichment.id,
        website,
      })

      await setEnrichmentStatus(
        userPlaceId,
        'processing',
        'Generating contact information',
        90,
        jobId,
      )

      await setEnrichmentStatus(
        userPlaceId,
        'processing',
        'Finalizing enrichment',
        95,
        jobId,
      )

      await populateContactFromEnrichment({
        enrichmentId: insertedEnrichment.id,
        userPlaceId,
      })

      await setEnrichmentStatus(
        userPlaceId,
        'completed',
        'Enrichment completed successfully',
        100,
        jobId,
      )

      logger.info({
        msg: 'Website enrichment manager completed [social media]',
        event: 'website_enrichment_manager_completed',
        metadata: { website, timeToEnrich: Date.now() - startTime },
      })
      return
    }

    // Check if subpage
    if (isSubPage(website)) {
      await setEnrichmentStatus(
        userPlaceId,
        'processing',
        'Optimizing scraping strategy',
        13,
        jobId,
      )
      logger.debug({
        msg: 'Website is a subpage',
        event: 'website_is_subpage',
        metadata: { website },
      })
    }

    // Step 7: Prepare scraping (13-15%)
    await setEnrichmentStatus(
      userPlaceId,
      'processing',
      'Preparing website scanner',
      14,
      jobId,
    )
    jobTracker.updateProgress(jobId, 'Preparing website scanner')

    logger.debug({
      msg: 'Getting website vectors',
      event: 'getting_website_vectors',
      metadata: { domain, userPlaceId },
    })

    const websiteVectors = await getWebsiteVectors(domain)

    if (websiteVectors.length > 0) {
      await setEnrichmentStatus(
        userPlaceId,
        'processing',
        'Initializing fresh scan',
        15,
        jobId,
      )

      logger.debug({
        msg: 'Website already exists in qdrant, deleting vectors before scraping',
        event: 'website_already_exists_in_qdrant',
        metadata: { website },
      })
      await deleteWebsiteVectors(domain)
    }

    // Step 8: SCRAPE HOMEPAGE (15-25%) - TIME INTENSIVE
    await setEnrichmentStatus(
      userPlaceId,
      'processing',
      `Scanning homepage: ${website}`,
      16,
      jobId,
    )
    jobTracker.updateProgress(jobId, `Scanning homepage: ${website}`)

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

      await setEnrichmentStatus(
        userPlaceId,
        'processing',
        'Using alternative data sources',
        30,
        jobId,
      )

      await setEnrichmentStatus(
        userPlaceId,
        'processing',
        'Searching governmental databases',
        60,
        jobId,
      )
      jobTracker.updateProgress(
        jobId,
        'Searching governmental databases (scraping failed)',
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

    // Step 9: Analyze homepage (25%)
    await setEnrichmentStatus(
      userPlaceId,
      'processing',
      'Analyzing homepage content',
      25,
      jobId,
    )
    jobTracker.updateProgress(jobId, 'Analyzing homepage content')

    const { metadata, links } = scrapeResult

    // Step 10: Determine crawl strategy (26-27%)
    await setEnrichmentStatus(
      userPlaceId,
      'processing',
      'Identifying key pages to scan',
      26,
      jobId,
    )
    jobTracker.updateProgress(jobId, 'Identifying key pages to scan')

    let crawlStrategy = links.internal

    if (links.internal.length > 10) {
      const businessName = await getBusinessName(userPlaceId)

      await setEnrichmentStatus(
        userPlaceId,
        'processing',
        'Selecting most relevant pages',
        27,
        jobId,
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

    await setEnrichmentStatus(
      userPlaceId,
      'processing',
      `Starting scan of ${crawlStrategy.length} additional pages`,
      28,
      jobId,
    )
    jobTracker.updateProgress(
      jobId,
      `Starting scan of ${crawlStrategy.length} additional pages`,
    )

    let completedPages = 0
    const totalPages = crawlStrategy.length
    const subpageResults = await Promise.allSettled(
      crawlStrategy.map(async (url: string, index: number) => {
        try {
          const progressPercent = 28 + Math.floor((index / totalPages) * 47)

          await setEnrichmentStatus(
            userPlaceId,
            'processing',
            `Scanning: ${url}`,
            progressPercent,
            jobId,
          )

          const result = await enqueueScraperJob(
            url,
            insertedEnrichment.id,
            true,
            userPlaceId,
          )

          completedPages++

          // Update with progress count (show every 20% or at completion)
          if (
            completedPages % Math.max(1, Math.floor(totalPages / 5)) === 0 ||
            completedPages === totalPages
          ) {
            const completionPercent =
              28 + Math.floor((completedPages / totalPages) * 47)
            await setEnrichmentStatus(
              userPlaceId,
              'processing',
              `Scanned ${completedPages}/${totalPages} pages`,
              completionPercent,
              jobId,
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

    await setEnrichmentStatus(
      userPlaceId,
      'processing',
      `Completed ${successfulSubpages}/${totalPages} pages successfully`,
      75,
      jobId,
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

    // Step 12: External data enrichment (76-85%)
    await setEnrichmentStatus(
      userPlaceId,
      'processing',
      'Searching governmental databases',
      85,
      jobId,
    )
    jobTracker.updateProgress(jobId, 'Searching governmental databases')

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
      await setEnrichmentStatus(
        userPlaceId,
        'processing',
        'Processing official company data',
        90,
        jobId,
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
    }

    // Step 13: Compile and save (86-100%)
    await setEnrichmentStatus(
      userPlaceId,
      'processing',
      'Compiling business data',
      95,
      jobId,
    )
    jobTracker.updateProgress(jobId, 'Compiling business data')

    await setEnrichmentStatus(
      userPlaceId,
      'processing',
      'Saving enrichment results',
      98,
      jobId,
    )

    await setEnrichmentStatus(
      userPlaceId,
      'processing',
      'Generating contact information',
      99,
      jobId,
    )

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
    ])

    await setEnrichmentStatus(
      userPlaceId,
      'completed',
      'Enrichment completed successfully',
      100,
      jobId,
    )
    jobTracker.updateProgress(jobId, 'Enrichment completed successfully')

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
      errorMessage || 'Enrichment failed',
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
