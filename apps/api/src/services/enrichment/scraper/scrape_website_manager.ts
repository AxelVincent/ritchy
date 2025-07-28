import { logger } from '@ritchy/logger'
import * as cheerio from 'cheerio'
import { scrapeWebsite } from '../../../external/firecrawl'
import { websiteRagIndexingPipeline } from '../../../external/langchain/website_rag_indexing_pipeline'
import { isValidUrl } from '../../../utils/is_valid_url'

import type { FirecrawlDocumentMetadata } from '@mendable/firecrawl-js'
import { getBusinessCountryCodeByEnrichmentId } from '../../enrichment/queries/get_business_country_code'
import { insertEnrichmentFacebook } from '../../enrichment/queries/insert_enrichment_facebook'
import { insertEnrichmentInstagram } from '../../enrichment/queries/insert_enrichment_instagram'
import { insertEnrichmentLinkedin } from '../../enrichment/queries/insert_enrichment_linkedin'
import { insertEnrichmentEmail } from '../queries/insert_enrichment_email'
import { insertEnrichmentPhone } from '../queries/insert_enrichment_phone'
import { cleanUrl } from './utils/clean_url'
import { extractContactsFromText } from './utils/extract_contacts_from_text'
import { getMainDomain } from './utils/get_main_domain'
import { isFile } from './utils/is_file'
import { isImage } from './utils/is_image'
import { normalizeFacebook } from './utils/normalize_facebook'
import { normalizeInstagram } from './utils/normalize_instagram'
import { normalizeLinkedin } from './utils/normalize_linkedin'
import { resolveUrl } from './utils/resolve_url'

type ScrapeResult = {
  links: Links
  metadata: FirecrawlDocumentMetadata
}

type Links = {
  emails: string[]
  phones: string[]
  external: string[]
  internal: string[]
  socials: {
    facebook: string[]
    instagram: string[]
    linkedin: string[]
  }
  files: string[]
  images: string[]
}

export const scrapeWebsiteManager = async (
  url: string,
  enrichmentId: string,
  onlyMainContent: boolean,
  userPlaceId: string,
): Promise<ScrapeResult | undefined> => {
  try {
    const time = Date.now()
    logger.info({
      msg: 'Scraping website',
      event: 'scraping_website',
      metadata: { url, userPlaceId },
    })
    const countryCode = await getBusinessCountryCodeByEnrichmentId(enrichmentId)
    const { rawHtml, markdown, metadata, success, error } = await scrapeWebsite(
      url,
      {
        formats: ['markdown', 'html', 'rawHtml'],
        excludeTags: ['img'],
        location: {
          country: countryCode ?? 'US',
        },
        proxy: 'auto',
        onlyMainContent,
      },
    )

    if (!success) {
      logger.error({
        msg: 'Failed to scrape website',
        event: 'scrape_website_failed',
        metadata: { url, error },
      })
      throw new Error('Failed to scrape website')
    }

    if (!rawHtml || !markdown) {
      logger.error({
        msg: 'No response returned from scrape',
        event: 'scrape_website_no_response',
        metadata: { url },
      })
      throw new Error('No response returned from scrape')
    }

    const mainDomain = getMainDomain(url)
    const $ = cheerio.load(rawHtml)

    // Use Sets to ensure uniqueness in each category
    const uniqueLinks = {
      emails: new Set<string>(),
      phones: new Set<string>(),
      external: new Set<string>(),
      internal: new Set<string>(),
      socials: {
        facebook: new Set<string>(),
        instagram: new Set<string>(),
        linkedin: new Set<string>(),
      },
      files: new Set<string>(),
      images: new Set<string>(),
    }

    // Extract contacts from visible text content
    const bodyText = $('body').text()
    const { emails, phones } = extractContactsFromText(bodyText)

    // Add extracted emails and phones
    for (const email of emails) {
      uniqueLinks.emails.add(email)
    }
    for (const phone of phones) {
      uniqueLinks.phones.add(phone)
    }

    await Promise.all(
      $('a')
        .map(async (_, element) => {
          const $link = $(element)
          let href = $link.attr('href') || ''

          href = cleanUrl(resolveUrl(url, href))

          if (href.startsWith('mailto:')) {
            await insertEnrichmentEmail(
              enrichmentId,
              href.replace('mailto:', ''),
            )
            uniqueLinks.emails.add(href.replace('mailto:', ''))
            return
          }

          if (href.startsWith('tel:')) {
            await insertEnrichmentPhone(enrichmentId, href.replace('tel:', ''))
            uniqueLinks.phones.add(href.replace('tel:', ''))
            return
          }

          if (!isValidUrl(href)) return

          if (isFile(href)) {
            uniqueLinks.files.add(href)
            return
          }

          if (isImage(href)) {
            uniqueLinks.images.add(href)
            return
          }

          if (href.includes('instagram.com')) {
            const cleanInstagram = normalizeInstagram(href)

            if (cleanInstagram) {
              logger.info({
                msg: 'Instagram link found',
                event: 'instagram_link_found',
                metadata: { url, href },
              })
              await insertEnrichmentInstagram(enrichmentId, cleanInstagram.url)
              uniqueLinks.socials.instagram.add(cleanInstagram.url)
            }
            return
          }

          if (href.includes('facebook.com')) {
            logger.info({
              msg: 'Facebook link found',
              event: 'facebook_link_found',
              metadata: { url, href },
            })
            const facebook = normalizeFacebook(href)
            if (facebook) {
              await insertEnrichmentFacebook(enrichmentId, facebook.url)
              uniqueLinks.socials.facebook.add(facebook.url)
            }
            return
          }

          if (href.includes('linkedin.com')) {
            logger.info({
              msg: 'LinkedIn link found',
              event: 'linkedin_link_found',
              metadata: { url, href },
            })
            const linkedin = normalizeLinkedin(href)
            if (linkedin) {
              await insertEnrichmentLinkedin(enrichmentId, linkedin.url)
              uniqueLinks.socials.linkedin.add(linkedin.url)
            }
            return
          }

          if (href.includes(mainDomain)) {
            uniqueLinks.internal.add(href)
            return
          }

          uniqueLinks.external.add(href)
        })
        .get(),
    )

    const internalLinks = Array.from(uniqueLinks.internal).filter(
      (internalUrl) => internalUrl !== cleanUrl(url),
    )

    await websiteRagIndexingPipeline(mainDomain, url, markdown)

    const responseTime = Date.now() - time
    logger.info({
      msg: 'Website scraped',
      event: 'website_scraped',
      metadata: { url, userPlaceId, responseTime },
    })

    return {
      metadata: metadata ?? {
        title: '',
        description: '',
        language: '',
        keywords: '',
        robots: '',
      },
      links: {
        emails: Array.from(uniqueLinks.emails),
        phones: Array.from(uniqueLinks.phones),
        external: Array.from(uniqueLinks.external),
        internal: internalLinks,
        socials: {
          facebook: Array.from(uniqueLinks.socials.facebook),
          instagram: Array.from(uniqueLinks.socials.instagram),
          linkedin: Array.from(uniqueLinks.socials.linkedin),
        },
        files: Array.from(uniqueLinks.files),
        images: Array.from(uniqueLinks.images),
      },
    }
  } catch (error) {
    logger.error({
      msg: 'Error scraping website',
      event: 'scrape_website_manager_error',
      metadata: {
        url,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : String(error),
      },
    })
  }
}
