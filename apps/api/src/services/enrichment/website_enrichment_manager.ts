import { logger } from '@ritchy/logger'
import { scrapeWebsiteManager } from './scraper/scrape_website_manager'
import { getMainDomain } from './scraper/utils/get_main_domain'
import { isSubPage } from './utils/is_sub_page'

import { eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { enrichment, enrichment as enrichmentTable } from '../../db/schema'
import { getCrawlStrategy } from '../../external/langchain/get_crawl_strategy'
import { getBusinessName } from './queries/get_business_name'
import { getPlaceByUserPlaceId } from './queries/get_place_by_user_place_id'

import { getWebsiteDescription } from '../../external/langchain/get_website_description'
import { deleteWebsiteVectors } from '../../external/qdrant/queries/delete_website_vectors'
import { getWebsiteVectors } from '../../external/qdrant/queries/get_website_vectors'
import { performWhoisLookup } from '../../external/whois/who_is_lookup'
import { enqueueScraperJob } from '../../internal/bullmq/jobs/scraper/queue'
import { populateContactFromEnrichment } from '../contact/populate_contact_from_enrichment'
import { processSocialMediaDomain } from './process_social_media_domain'
import { getBusinessWebsite } from './queries/get_business_website'
import { setUserPlaceAsEnriched } from './queries/set_user_place_as_enriched'
import { isSocialMediaUrl } from './utils/is_social_media_url'

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
  try {
    const place = await getPlaceByUserPlaceId(userPlaceId)
    if (!place) {
      logger.error({
        msg: 'Place not found',
        event: 'place_not_found',
        metadata: { userPlaceId },
      })
      return
    }

    const [existingEnrichment] = await db
      .select()
      .from(enrichmentTable)
      .where(eq(enrichmentTable.placeId, place.place.id))
      .limit(1)

    if (existingEnrichment) {
      await Promise.all([
        populateContactFromEnrichment({
          enrichmentId: existingEnrichment.id,
          userPlaceId,
        }),
        setUserPlaceAsEnriched(userPlaceId),
      ])
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

    const website = await getBusinessWebsite(userPlaceId)
    if (!website) {
      await db.insert(enrichmentTable).values({
        placeId: place.place.id,
        domain: null,
        domainRegisteredAt: null,
      })
      logger.error({
        msg: 'Website not found, skipping enrichment',
        event: 'website_not_found',
        metadata: { userPlaceId, timeToEnrich: Date.now() - startTime },
      })
      return
    }

    const domain = getMainDomain(website)
    const [insertedEnrichment] = await db
      .insert(enrichmentTable)
      .values({
        placeId: place.place.id,
        domain,
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
      await db
        .update(enrichmentTable)
        .set({
          error: scrapeResult.error.message,
          success: false,
        })
        .where(eq(enrichmentTable.id, enrichment.id))
      return
    }

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

    await Promise.all(
      crawlStrategy.map(async (url: string) => {
        await enqueueScraperJob(url, insertedEnrichment.id, true, userPlaceId)
      }),
    )

    logger.info({
      msg: 'Scraped website',
      event: 'scraped_website',
      metadata: {
        internal: links.internal,
        userPlaceId,
      },
    })

    const { description, shortDescription } =
      await getWebsiteDescription(domain)

    const whoisData = await performWhoisLookup(domain)
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

    const endTime = Date.now()
    const duration = endTime - startTime
    logger.info({
      msg: `Website enrichment manager completed [regular website] in ${duration / 1000} seconds`,
      event: 'website_enrichment_manager_completed',
      metadata: { userPlaceId, duration },
    })
    return {
      success: true,
      message: 'Website enriched successfully',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorDetails = {
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
    }
    logger.error(errorDetails)

    await Promise.all([
      setUserPlaceAsEnriched(userPlaceId),
      db
        .update(enrichmentTable)
        .set({
          error: errorMessage,
          success: false,
        })
        .where(eq(enrichmentTable.id, enrichment.id)),
    ])
    return {
      success: false,
      message: `Website enrichment failed: ${errorMessage}`,
      error: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
    }
  }
}
