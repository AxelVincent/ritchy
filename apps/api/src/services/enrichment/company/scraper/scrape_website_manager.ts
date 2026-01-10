import { logger } from '@ritchy/logger'
import * as cheerio from 'cheerio'

import type { FirecrawlDocumentMetadata } from '@mendable/firecrawl-js'
import { db } from '../../../../db/db'
import { enrichmentTechnology } from '../../../../db/schema/enrichment'
import { createVectorStore } from '../../../../external/langchain/utils/vector_store'
import { websiteRagIndexingPipeline } from '../../../../external/langchain/website_rag_indexing_pipeline'
import { processHtmlWithRust } from '../../../../external/rust-html-service/client'
import { insertEnrichmentFacebookBatch } from '../../shared/queries/insert_enrichment_facebook_batch'
import { insertEnrichmentInstagramBatch } from '../../shared/queries/insert_enrichment_instagram_batch'
import { insertEnrichmentLinkedinBatch } from '../../shared/queries/insert_enrichment_linkedin_batch'
import { insertEnrichmentPhone } from '../../shared/queries/insert_enrichment_phone'
import { isSocialMediaUrl } from '../../shared/utils/is_social_media_url'
import { scrapeWithFallbacks } from './scrape_with_fallbacks'
import { detectTechnologies } from './technology/detect_technologies'
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

/**
 * Feature flag to enable the Rust HTML service for processing.
 * When enabled, HTML processing (link/contact extraction, markdown conversion)
 * is offloaded to the high-performance Rust microservice.
 */
const USE_RUST_HTML_SERVICE = process.env.USE_RUST_HTML_SERVICE === 'true'

type ScrapeResult = {
  links: Links
  metadata: FirecrawlDocumentMetadata
}

type Links = {
  internal: string[]
}

type UniqueLinks = {
  emails: Set<string>
  phones: Set<string>
  socials: {
    instagram: Set<NormalizedInstagram>
    facebook: Set<NormalizedFacebook>
    linkedin: Set<NormalizedLinkedin>
  }
  internal: Set<string>
}

/**
 * Processes a single HTML chunk to extract contacts and links using Node.js/Cheerio.
 */
const processHtmlChunk = (
  chunk: string,
  url: string,
  uniqueLinks: UniqueLinks,
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

/**
 * Process HTML using the Rust HTML service.
 * Returns the extracted data and markdown, or null if the service fails.
 */
const processWithRustService = async (
  html: string,
  rawHtml: string | null,
  url: string,
  enrichmentId: string,
  userPlaceId: string,
): Promise<{
  markdown: string
  uniqueLinks: UniqueLinks
} | null> => {
  try {
    const result = await processHtmlWithRust({
      html,
      rawHtml: rawHtml ?? undefined,
      url,
      options: {
        convertToMarkdown: true,
        extractContacts: true,
        extractLinks: true,
        extractScripts: true,
      },
    })

    if (!result.success) {
      logger.warn({
        msg: '[Scrape Website Manager] Rust service returned error, falling back to Node.js',
        event: 'rust_service_error_fallback',
        metadata: {
          url,
          userPlaceId,
          enrichmentId,
          error: result.error,
        },
      })
      return null
    }

    // Rust service already handles normalization and deduplication
    // Convert arrays to Sets for compatibility with the rest of the code
    const uniqueLinks: UniqueLinks = {
      emails: new Set(result.data.contacts.emails),
      phones: new Set(result.data.contacts.phones),
      socials: {
        instagram: new Set(result.data.links.social.instagram),
        facebook: new Set(result.data.links.social.facebook),
        linkedin: new Set(result.data.links.social.linkedin),
      },
      internal: new Set(result.data.links.internal),
    }

    logger.info({
      msg: '[Scrape Website Manager] Processed with Rust service',
      event: 'rust_service_processing_complete',
      metadata: {
        url,
        userPlaceId,
        enrichmentId,
        processingTimeMs: result.metadata.processingTimeMs,
        counts: {
          emails: uniqueLinks.emails.size,
          phones: uniqueLinks.phones.size,
          instagram: uniqueLinks.socials.instagram.size,
          facebook: uniqueLinks.socials.facebook.size,
          linkedin: uniqueLinks.socials.linkedin.size,
          internal: uniqueLinks.internal.size,
        },
      },
    })

    return {
      markdown: result.data.markdown,
      uniqueLinks,
    }
  } catch (error) {
    logger.warn({
      msg: '[Scrape Website Manager] Rust service request failed, falling back to Node.js',
      event: 'rust_service_request_failed_fallback',
      metadata: {
        url,
        userPlaceId,
        enrichmentId,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    return null
  }
}

/**
 * Process HTML using Node.js/Cheerio (original implementation).
 */
const processWithNodeJs = (
  html: string,
  url: string,
  enrichmentId: string,
  userPlaceId: string,
): UniqueLinks => {
  const uniqueLinks: UniqueLinks = {
    emails: new Set<string>(),
    phones: new Set<string>(),
    socials: {
      instagram: new Set<NormalizedInstagram>(),
      facebook: new Set<NormalizedFacebook>(),
      linkedin: new Set<NormalizedLinkedin>(),
    },
    internal: new Set<string>(),
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

  return uniqueLinks
}

export const scrapeWebsiteManager = async (
  url: string,
  enrichmentId: string,
  onlyMainContent: boolean,
  userPlaceId: string,
): Promise<ScrapeResult> => {
  // Use mutable variables for large strings so we can explicitly free memory
  let html: string | null = null
  let rawHtml: string | null = null
  let markdown: string | null = null

  try {
    const time = Date.now()
    logger.debug({
      msg: `[Scrape Website Manager] Scraping ${url}`,
      event: 'scraping_website',
      metadata: { url, userPlaceId, useRustService: USE_RUST_HTML_SERVICE },
    })

    const scrapeResult = await scrapeWithFallbacks(url, userPlaceId, {
      formats: ['markdown', 'html', 'rawHtml'],
      excludeTags: ['img', 'script', 'style', 'link', 'meta', 'noscript'],
      proxy: 'auto',
      onlyMainContent,
    })

    // Extract to mutable variables
    html = scrapeResult.html ?? null
    rawHtml = scrapeResult.rawHtml ?? null
    markdown = scrapeResult.markdown ?? null
    const { metadata, success, error } = scrapeResult

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

    // Process HTML - use Rust service if enabled, otherwise fall back to Node.js
    let uniqueLinks: UniqueLinks
    let finalMarkdown: string = markdown

    if (USE_RUST_HTML_SERVICE) {
      const rustResult = await processWithRustService(
        html,
        rawHtml,
        url,
        enrichmentId,
        userPlaceId,
      )

      if (rustResult) {
        uniqueLinks = rustResult.uniqueLinks
        finalMarkdown = rustResult.markdown
        // MEMORY CLEANUP: Free html after Rust processing
        html = null
      } else {
        // Fallback to Node.js processing
        uniqueLinks = processWithNodeJs(html, url, enrichmentId, userPlaceId)
        // MEMORY CLEANUP: Free html after Node.js chunking
        html = null
      }
    } else {
      // Use Node.js processing
      uniqueLinks = processWithNodeJs(html, url, enrichmentId, userPlaceId)
      // MEMORY CLEANUP: Free html after chunking is complete
      html = null
    }

    logger.debug({
      msg: `[Scrape Website Manager] Inserting social media data for ${url}`,
      event: 'inserting_social_media_data',
      metadata: {
        userPlaceId,
        enrichmentId,
        url,
        counts: {
          emails: uniqueLinks.emails.size,
          phones: uniqueLinks.phones.size,
          instagram: uniqueLinks.socials.instagram.size,
          facebook: uniqueLinks.socials.facebook.size,
          linkedin: uniqueLinks.socials.linkedin.size,
          internal: uniqueLinks.internal.size,
        },
      },
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

    // Create per-job vectorStore to prevent memory accumulation from embeddings cache
    const vectorStore = await createVectorStore()
    await websiteRagIndexingPipeline(
      vectorStore,
      mainDomain,
      url,
      finalMarkdown,
    )

    // MEMORY CLEANUP: Free markdown after RAG indexing (no longer needed)
    markdown = null

    // Detect technologies (use rawHtml which contains scripts/meta tags)
    logger.debug({
      msg: `[Scrape Website Manager] Detecting technologies for ${url}`,
      event: 'detecting_technologies',
      metadata: {
        url,
        userPlaceId,
        enrichmentId,
        rawHtmlLength: rawHtml?.length ?? 0,
      },
    })
    if (rawHtml && rawHtml.length > 0) {
      const technologies = await detectTechnologies(rawHtml, url, enrichmentId)

      // MEMORY CLEANUP: Free rawHtml after technology detection (no longer needed)
      rawHtml = null

      // Store technologies in database
      if (technologies.length > 0) {
        try {
          await db
            .insert(enrichmentTechnology)
            .values(
              technologies.map((tech) => ({
                enrichmentId,
                technology: tech.technology.toLowerCase(), // Normalize to lowercase
                category: tech.category,
                confidence: tech.confidence,
                evidence: tech.evidence,
                patternId: tech.patternId || null,
                detectionMethod: tech.detectionMethod,
              })),
            )
            .onConflictDoNothing()

          logger.info({
            msg: `[Scrape Website Manager] Stored ${technologies.length} technologies`,
            event: 'technologies_stored',
            metadata: {
              url,
              userPlaceId,
              enrichmentId,
              count: technologies.length,
              byCategory: technologies.reduce(
                (acc, t) => {
                  acc[t.category] = (acc[t.category] || 0) + 1
                  return acc
                },
                {} as Record<string, number>,
              ),
            },
          })
        } catch (error) {
          logger.error({
            msg: '[Scrape Website Manager] Failed to store technologies',
            event: 'technologies_store_error',
            metadata: {
              url,
              userPlaceId,
              enrichmentId,
              error: error instanceof Error ? error.message : String(error),
            },
          })
        }
      }
    } else {
      // MEMORY CLEANUP: Free rawHtml even if not used for tech detection
      rawHtml = null
    }

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
