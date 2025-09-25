import { logger } from '@ritchy/logger'
import * as cheerio from 'cheerio'

import type { FirecrawlDocumentMetadata } from '@mendable/firecrawl-js'
import { db } from '../../../db/db'
import { websiteRagIndexingPipeline } from '../../../external/langchain/website_rag_indexing_pipeline'
import { getBusinessCountryCodeByEnrichmentId } from '../../enrichment/queries/get_business_country_code'
import { insertEnrichmentFacebookBatch } from '../queries/insert_enrichment_facebook_batch'
import { insertEnrichmentInstagramBatch } from '../queries/insert_enrichment_instagram_batch'
import { insertEnrichmentLinkedinBatch } from '../queries/insert_enrichment_linkedin_batch'
import { insertEnrichmentPhone } from '../queries/insert_enrichment_phone'
import { isSocialMediaUrl } from '../utils/is_social_media_url'
import { scrapeWithFallbacks } from './scrape_with_fallbacks'
import { cleanUrl } from './utils/clean_url'
import { createHtmlChunks } from './utils/create_html_chunks'
import { extractContactsFromText } from './utils/extract_contacts_from_text'
import { getMainDomain } from './utils/get_main_domain'
import { isWebContentUrl } from './utils/is_web_content_url'
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
import { verifyAndInsertEnrichmentEmail } from './verify_and_insert_enrichment_email'

type ScrapeResult = {
  links: Links
  metadata: FirecrawlDocumentMetadata
}

type Links = {
  internal: string[]
}

/**
 * Processes a single HTML chunk to extract contacts and links
 */
const processHtmlChunk = (
  chunk: string,
  url: string,
  uniqueLinks: {
    emails: Set<string>
    phones: Set<string>
    socials: {
      instagram: Set<NormalizedInstagram>
      facebook: Set<NormalizedFacebook>
      linkedin: Set<NormalizedLinkedin>
    }
    internal: Set<string>
  },
) => {
  try {
    const $ = cheerio.load(chunk, {
      xml: {
        decodeEntities: false,
      },
    })

    // Extract contacts from visible text content in this chunk
    const chunkText = $(chunk).text()
    const { emails, phones } = extractContactsFromText(chunkText)

    // Add extracted emails and phones
    for (const email of emails) {
      uniqueLinks.emails.add(email)
    }
    for (const phone of phones) {
      uniqueLinks.phones.add(phone)
    }

    $('a[href^="mailto:"]').each((_, element) => {
      const href = $(element).attr('href')
      if (href) {
        const email = href.replace('mailto:', '').trim()
        if (email) {
          uniqueLinks.emails.add(email)
        }
      }
    })

    // Process links in this chunk
    $('a').each((_, element) => {
      const href = $(element).attr('href') || ''
      const cleanHref = cleanUrl(resolveUrl(url, href))
      const mainDomain = getMainDomain(url)

      // Skip non-web content URLs (PDFs, images, etc.)
      if (!isWebContentUrl(cleanHref)) {
        return
      }

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
  } catch (error) {
    logger.warn({
      msg: `[Scrape Website Manager] Error processing HTML chunk for ${url}`,
      event: 'chunk_processing_error',
      metadata: {
        url,
        error: (error instanceof Error ? error.message : String(error)).slice(
          0,
          250,
        ),
      },
    })
  }
}

export const scrapeWebsiteManager = async (
  url: string,
  enrichmentId: string,
  onlyMainContent: boolean,
  userPlaceId: string,
): Promise<ScrapeResult> => {
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
    logger.debug({
      msg: `[Scrape Website Manager] Scraping ${url}`,
      event: 'scraping_website',
      metadata: { url, userPlaceId },
    })

    const { html, markdown, metadata, success, error } =
      await scrapeWithFallbacks(url, userPlaceId, {
        formats: ['markdown', 'html'],
        excludeTags: ['img', 'script', 'style', 'link', 'meta', 'noscript'],
        country: 'US',
        proxy: 'auto',
        onlyMainContent,
      })

    const MAX_HTML_SIZE = 5 * 1024 * 1024 // 5MB
    if (html && html.length > MAX_HTML_SIZE) {
      logger.warn({
        msg: `[Scrape Website Manager] HTML size exceeds limit for ${url}`,
        event: 'scrape_website_html_size_exceeded',
        metadata: { url, userPlaceId, enrichmentId, htmlSize: html.length },
      })
    }

    if (!success) {
      logger.error({
        msg: `[Scrape Website Manager] Failed to scrape ${url}`,
        event: 'scrape_website_failed',
        metadata: { url, userPlaceId, enrichmentId, error },
      })
      throw new Error('Failed to scrape website')
    }

    if (!html || !markdown) {
      logger.error({
        msg: `[Scrape Website Manager] No response returned from scrape ${url}`,
        event: 'scrape_website_no_response',
        metadata: { url, userPlaceId, enrichmentId },
      })
      throw new Error('No response returned from scrape')
    }

    // Use chunking instead of processing the full HTML document
    const CHUNK_SIZE = 64 * 1024 // 64KB chunks
    const chunks = createHtmlChunks(html, CHUNK_SIZE)

    logger.debug({
      msg: `[Scrape Website Manager] Processing ${chunks.length} HTML chunks for ${url}`,
      event: 'processing_html_chunks',
      metadata: {
        url,
        userPlaceId,
        enrichmentId,
        chunkCount: chunks.length,
        totalSize: html.length,
      },
    })

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      logger.debug({
        msg: `[Scrape Website Manager] Processing chunk ${i + 1}/${chunks.length} for ${url}`,
        event: 'processing_chunk',
        metadata: {
          url,
          userPlaceId,
          enrichmentId,
          chunkIndex: i,
          chunkSize: chunk.length,
        },
      })

      processHtmlChunk(chunk, url, uniqueLinks)
    }

    logger.debug({
      msg: `[Scrape Website Manager] Inserting social media data for ${url}`,
      event: 'inserting_social_media_data',
      metadata: { userPlaceId, enrichmentId, uniqueLinks, url },
    })

    await db.transaction(async (tx) => {
      // Batch insert with specific data
      await Promise.all([
        insertEnrichmentInstagramBatch(
          enrichmentId,
          Array.from(uniqueLinks.socials.instagram),
          tx,
        ),
        insertEnrichmentFacebookBatch(
          enrichmentId,
          Array.from(uniqueLinks.socials.facebook),
          tx,
        ),
        insertEnrichmentLinkedinBatch(
          enrichmentId,
          Array.from(uniqueLinks.socials.linkedin),
          tx,
        ),
      ])
    })

    for (const email of uniqueLinks.emails) {
      await verifyAndInsertEnrichmentEmail(
        userPlaceId,
        enrichmentId,
        url,
        email,
      )
    }

    for (const phone of uniqueLinks.phones) {
      await insertEnrichmentPhone(userPlaceId, enrichmentId, url, phone)
    }

    const internalLinks = Array.from(uniqueLinks.internal).filter(
      (internalUrl) => internalUrl !== cleanUrl(url),
    )

    // Explicitly clear Sets to free memory for large websites
    uniqueLinks.emails.clear()
    uniqueLinks.phones.clear()
    uniqueLinks.socials.instagram.clear()
    uniqueLinks.socials.facebook.clear()
    uniqueLinks.socials.linkedin.clear()
    uniqueLinks.internal.clear()

    const mainDomain = getMainDomain(url)
    await websiteRagIndexingPipeline(mainDomain, url, markdown)

    const responseTimeInSeconds = (Date.now() - time) / 1000
    logger.debug({
      msg: `[Scrape Website Manager] ${url} scraped successfully in ${responseTimeInSeconds} seconds`,
      event: 'website_scraped_success',
      metadata: { url, userPlaceId, enrichmentId, responseTimeInSeconds },
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
      msg: `[Scrape Website Manager] Error scraping ${url}`,
      event: 'scrape_website_manager_error',
      metadata: {
        url,
        userPlaceId,
        enrichmentId,
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

    throw new Error(`Scraping failed: ${errorMessage}`)
  }
}
