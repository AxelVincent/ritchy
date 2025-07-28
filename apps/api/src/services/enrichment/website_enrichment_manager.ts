import { logger } from '@ritchy/logger'
import { getWebsiteVectors } from './queries/get_website_vectors'
import { scrapeWebsiteManager } from './scraper/scrape_website_manager'
import { getMainDomain } from './scraper/utils/get_main_domain'
import { isSubPage } from './utils/is_sub_page'

import { eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { enrichment as enrichmentTable } from '../../db/schema'
import { getCrawlStrategy } from '../../external/langchain/get_crawl_strategy'
import { getBusinessName } from './queries/get_business_name'
import { getPlaceByUserPlaceId } from './queries/get_place_by_user_place_id'

import { performWhoisLookup } from '../../external/whois/who_is_lookup'
import { populateContactFromEnrichment } from '../contact/populate_contact_from_enrichment'
import { getBusinessWebsite } from './queries/get_business_website'

export const websiteEnrichmentManager = async ({
  userPlaceId,
}: {
  userPlaceId: string
}) => {
  const startTime = Date.now()
  logger.info({
    msg: 'Starting website enrichment manager',
    event: 'website_enrichment_manager_start',
    metadata: { userPlaceId },
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
      await populateContactFromEnrichment({
        enrichmentId: existingEnrichment.id,
        userPlaceId,
      })
      logger.info({
        msg: 'Website already enriched',
        event: 'website_already_enriched',
        metadata: { website: existingEnrichment.domain, userPlaceId },
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
        msg: 'Website not found',
        event: 'website_not_found',
        metadata: { userPlaceId },
      })
      return
    }

    // TODO: check if the website is a social media website
    // if it is, we need to insert the social media website into the enrichment table
    // and return

    const domain = getMainDomain(website)
    const whoisData = await performWhoisLookup(domain)

    // TODO: check if the website is a subpage
    // if it is, we need :
    // - to avoid main platform where useless data could be found
    // - to scrape only the subpage
    if (isSubPage(website)) {
      logger.info({
        msg: 'Website is a subpage',
        event: 'website_is_subpage',
        metadata: { website },
      })
    }

    const [enrichment] = await db
      .insert(enrichmentTable)
      .values({
        placeId: place.place.id,
        domain,
        domainRegisteredAt: whoisData?.registrationDate
          ? new Date(whoisData.registrationDate)
          : null,
      })
      .returning()

    // logger.info({
    //   msg: 'Getting website vectors',
    //   event: 'getting_website_vectors',
    //   metadata: { domain, userPlaceId },
    // })
    // const websiteVectors = await getWebsiteVectors(domain)

    // if (websiteVectors.length > 0) {
    //   logger.info({
    //     msg: 'Website already exists in qdrant',
    //     event: 'website_already_exists',
    //     metadata: {
    //       website,
    //     },
    //   })
    //   return
    // }

    const scrapeResult = await scrapeWebsiteManager(
      website,
      enrichment.id,
      false,
      userPlaceId,
    )
    if (!scrapeResult) {
      logger.error({
        msg: 'Failed to scrape website',
        event: 'failed_to_scrape_website',
        metadata: { website, userPlaceId },
      })
      return
    }
    const { metadata, links } = scrapeResult
    let crawlStrategy = links.internal
    if (links.internal.length > 30) {
      const businessName = await getBusinessName(userPlaceId)
      crawlStrategy = await getCrawlStrategy(
        links.internal,
        businessName ?? domain,
      )
      logger.info({
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
      crawlStrategy.map((url) =>
        scrapeWebsiteManager(url, enrichment.id, true, userPlaceId),
      ),
    )

    logger.info({
      msg: 'Scraped website',
      event: 'scraped_website',
      metadata: {
        internal: links.internal,
        userPlaceId,
      },
    })

    await Promise.all([
      db
        .update(enrichmentTable)
        .set({
          title: metadata.title,
          description: metadata.description,
          language: metadata.language,
          keywords: metadata.keywords,
          favicon: metadata.favicon,
          robots: metadata.robots,
        })
        .where(eq(enrichmentTable.id, enrichment.id)),
      populateContactFromEnrichment({
        enrichmentId: enrichment.id,
        userPlaceId,
      }),
    ])

    const endTime = Date.now()
    const duration = endTime - startTime
    logger.info({
      msg: 'Website enrichment manager completed',
      event: 'website_enrichment_manager_completed',
      metadata: { userPlaceId, duration },
    })
    return {
      success: true,
      message: 'Website enriched successfully',
    }
  } catch (error) {
    // Determine the error type and provide more specific error information
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

    // Return a more specific error message based on the error type
    return {
      success: false,
      message:
        error instanceof Error
          ? `Website enrichment failed: ${error.message}`
          : 'An unexpected error occurred during website enrichment',
      error: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
    }
  }
}
