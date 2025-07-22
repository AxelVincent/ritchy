import { logger } from '@ritchy/logger'
import { getWebsiteVectors } from './queries/get_website_vectors'
import { isSocialMediaDomain } from './utils/is_social_media_domain'
import { getMainDomain } from '../scraper/utils/get_main_domain'
import { isSubPage } from './utils/is_sub_page'
import { scrapeWebsiteManager } from '../scraper/scrape_website_manager'
import { scrapeUrlsFromWebPage } from '../scraper/scrape_urls_from_web_page'

export const websiteEnrichmentManager = async ({ url }: { url: string }) => {
  const domain = getMainDomain(url)

  if (isSocialMediaDomain(domain)) {
    // TODO: Store in db directly and return
    logger.info({
      msg: 'Website is a social media domain',
      event: 'website_is_social_media_domain',
      metadata: { url }
    })
    return
  }

  if (isSubPage(url)) {
    logger.info({
      msg: 'Website is a subpage',
      event: 'website_is_subpage',
      metadata: { url }
    })
    return
  }

  const websiteVectors = await getWebsiteVectors(domain)

  if (websiteVectors.length > 0) {
    logger.info({
      msg: 'Website already exists in qdrant',
      event: 'website_already_exists',
      metadata: {
        url
      }
    })
    return
  }

  const {
    links: {
      socials: { facebook, instagram, linkedin },
      internal
    }
  } = await scrapeWebsiteManager(url)

  for (const link of facebook) {
    if (isSocialMediaDomain(link)) {
      socials.push(link)
    }
  }

  const crawlStrategy = links.internal
  if (links.internal.length > 30) {
    // Calll Langchain for crawl strategy
    logger.info({
      msg: 'Website has too many internal links',
      event: 'website_has_too_many_internal_links',
      metadata: {
        url
      }
    })
  }

  for (const url of crawlStrategy) {
    const { links } = await scrapeUrlsFromWebPage(url)
    socials.push(...links.social)
  }

  logger.info({
    msg: 'Scraped website',
    event: 'scraped_website',
    metadata: {
      internal: links.internal
    }
  })

  // Store in cache
}
