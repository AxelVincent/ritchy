import { logger } from '@ritchy/logger'
import * as cheerio from 'cheerio'
import { scrapeWithRetry } from '../../../external/firecrawl'

import type { FirecrawlDocumentMetadata } from '@mendable/firecrawl-js'
import { websiteRagIndexingPipeline } from '../../../external/langchain/website_rag_indexing_pipeline'
import { getBusinessCountryCodeByEnrichmentId } from '../../enrichment/queries/get_business_country_code'
import { insertEnrichmentEmail } from '../queries/insert_enrichment_email'
import { insertEnrichmentFacebookBatch } from '../queries/insert_enrichment_facebook_batch'
import { insertEnrichmentInstagramBatch } from '../queries/insert_enrichment_instagram_batch'
import { insertEnrichmentLinkedinBatch } from '../queries/insert_enrichment_linkedin_batch'
import { insertEnrichmentPhone } from '../queries/insert_enrichment_phone'
import { isSocialMediaUrl } from '../utils/is_social_media_url'
import { cleanUrl } from './utils/clean_url'
import { extractContactsFromText } from './utils/extract_contacts_from_text'
import { getMainDomain } from './utils/get_main_domain'
import { normaliseInternalUrl } from './utils/normalise_internal_url'
import {
  type NormalizedFacebook,
  normalizeFacebook,
} from './utils/normalize_facebook'
import {
  type NormalizedInstagram,
  normalizeInstagram,
} from './utils/normalize_instagram'
import {
  type NormalizedLinkedin,
  normalizeLinkedin,
} from './utils/normalize_linkedin'
import { resolveUrl } from './utils/resolve_url'

type ScrapeResult = {
  links: Links
  metadata: FirecrawlDocumentMetadata
}

type Links = {
  internal: string[]
}

type ScrapeError = {
  error: {
    name: string
    message: string
    stack: string
  }
}

export const scrapeWebsiteManager = async (
  url: string,
  enrichmentId: string,
  onlyMainContent: boolean,
  userPlaceId: string,
): Promise<ScrapeResult | ScrapeError> => {
  // Modify the uniqueLinks structure
  const uniqueLinks = {
    emails: new Set<string>(),
    phones: new Set<string>(),
    socials: {
      instagram: new Set<NormalizedInstagram>(),
      facebook: new Set<NormalizedFacebook>(),
      linkedin: new Set<NormalizedLinkedin>(),
    },
    internal: new Set<string>(),
  }
  try {
    const time = Date.now()
    logger.info({
      msg: 'Scraping website',
      event: 'scraping_website',
      metadata: { url, userPlaceId },
    })
    const countryCode = await getBusinessCountryCodeByEnrichmentId(enrichmentId)

    const { rawHtml, markdown, metadata, success, error } =
      await scrapeWithRetry(url, {
        formats: ['markdown', 'rawHtml'],
        excludeTags: ['img', 'script', 'style', 'link', 'meta', 'noscript'],
        location: {
          country: countryCode ?? 'US',
        },
        proxy: 'auto',
        onlyMainContent,
      })

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

    const $ = cheerio.load(rawHtml, {
      xml: {
        decodeEntities: false,
      },
    })

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

    // Process links with specific data
    $('a').each((_, element) => {
      const href = $(element).attr('href') || ''
      const cleanHref = cleanUrl(resolveUrl(url, href))
      const mainDomain = getMainDomain(url)

      // Check if the URL is internal (either contains domain or starts with /)
      if (cleanHref.includes(mainDomain) && !isSocialMediaUrl(cleanHref)) {
        const normalisedHref = normaliseInternalUrl(cleanHref, mainDomain)
        if (normalisedHref) {
          uniqueLinks.internal.add(normalisedHref)
        }
        return
      }

      if (cleanHref.includes('instagram.com')) {
        const clean = normalizeInstagram(cleanHref)
        if (clean) {
          uniqueLinks.socials.instagram.add({
            url: clean.url,
            username: clean.username,
          })
        }
      } else if (cleanHref.includes('facebook.com')) {
        const clean = normalizeFacebook(cleanHref)
        if (clean) {
          uniqueLinks.socials.facebook.add({
            url: clean.url,
            username: clean.username,
          })
        }
      } else if (cleanHref.includes('linkedin.com')) {
        const clean = normalizeLinkedin(cleanHref)
        if (clean) {
          uniqueLinks.socials.linkedin.add({
            url: clean.url,
            name: clean.name,
            type: clean.type,
          })
        }
      }
    })

    logger.info({
      msg: 'Inserting social media data',
      event: 'inserting_social_media_data',
      metadata: { enrichmentId, uniqueLinks },
    })
    // Batch insert with specific data
    await Promise.all([
      insertEnrichmentInstagramBatch(
        enrichmentId,
        Array.from(uniqueLinks.socials.instagram),
      ),
      insertEnrichmentFacebookBatch(
        enrichmentId,
        Array.from(uniqueLinks.socials.facebook),
      ),
      insertEnrichmentLinkedinBatch(
        enrichmentId,
        Array.from(uniqueLinks.socials.linkedin),
      ),
    ])

    logger.info({
      msg: 'Inserting email data',
      event: 'inserting_email_data',
      metadata: { enrichmentId, uniqueLinks },
    })
    for (const email of uniqueLinks.emails) {
      await insertEnrichmentEmail(enrichmentId, url, email)
    }

    logger.info({
      msg: 'Inserting phone data',
      event: 'inserting_phone_data',
      metadata: { enrichmentId, uniqueLinks },
    })
    for (const phone of uniqueLinks.phones) {
      await insertEnrichmentPhone(enrichmentId, url, phone)
    }

    const internalLinks = Array.from(uniqueLinks.internal).filter(
      (internalUrl) => internalUrl !== cleanUrl(url),
    )

    const mainDomain = getMainDomain(url)
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
        internal: internalLinks,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
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
    return {
      error: {
        name: 'ScrapeError',
        message: errorMessage,
        stack: error instanceof Error ? (error.stack ?? '') : '',
      },
    }
  }
}
