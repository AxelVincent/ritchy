import { logger } from '@ritchy/logger'
import * as cheerio from 'cheerio'
import type { ExtractedScript } from './types'

// Extraction constants
const INLINE_CODE_MIN_LENGTH = 30
const INLINE_CODE_MAX_LENGTH = 300
const LOG_SAMPLE_COUNT = 5
const LOG_SAMPLE_MAX_LENGTH = 100

// Relevant meta tag prefixes for technology detection
const RELEVANT_META_PREFIXES = [
  'generator',
  'fb:',
  'og:',
  'twitter:',
  'shopify',
]

/**
 * Normalizes a script URL to absolute format
 */
const normalizeScriptUrl = (src: string, baseUrl: string): string => {
  if (src.startsWith('http')) return src
  try {
    return new URL(src, baseUrl).href
  } catch {
    return src
  }
}

/**
 * Extracts all technology signals from HTML
 * Includes: script URLs, inline code, meta tags, iframes
 */
export const extractScripts = (
  html: string,
  url: string,
): ExtractedScript[] => {
  const $ = cheerio.load(html)
  const scripts: ExtractedScript[] = []
  const seenUrls = new Set<string>()

  // 1. Extract script URLs from <script src="..."> tags
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src')
    if (!src) return

    const absoluteUrl = normalizeScriptUrl(src, url)
    if (!seenUrls.has(absoluteUrl)) {
      seenUrls.add(absoluteUrl)
      scripts.push({
        type: 'script_url',
        value: absoluteUrl,
      })
    }
  })

  // 1b. Extract dynamically loaded script URLs from inline JavaScript
  // Pattern: element.src = "https://cdn.example.com/script.js"
  const dynamicScriptRegex =
    /\.src\s*=\s*["']((https?:)?\/\/[^"']+\.js[^"']*)["']/g
  const dynamicMatches = html.matchAll(dynamicScriptRegex)

  for (const match of dynamicMatches) {
    const src = match[1]
    const absoluteUrl = normalizeScriptUrl(src, url)

    if (!seenUrls.has(absoluteUrl)) {
      seenUrls.add(absoluteUrl)
      scripts.push({
        type: 'script_url',
        value: absoluteUrl,
      })
    }
  }

  // 2. Extract inline scripts (limited to first N chars)
  $('script:not([src])').each((_, el) => {
    const code = $(el).text().trim()

    // Skip empty, very short, or data-only scripts (JSON-LD, etc)
    if (
      code.length < INLINE_CODE_MIN_LENGTH ||
      code.startsWith('{') ||
      code.startsWith('[')
    ) {
      return
    }

    scripts.push({
      type: 'inline_code',
      value: code.slice(0, INLINE_CODE_MAX_LENGTH),
    })
  })

  // 3. Extract key meta tags
  $('meta[name], meta[property]').each((_, el) => {
    const name = $(el).attr('name') || $(el).attr('property')
    const content = $(el).attr('content')

    if (!name || !content) return

    // Only extract relevant meta tags
    const isRelevant = RELEVANT_META_PREFIXES.some((prefix) =>
      name.toLowerCase().startsWith(prefix),
    )

    if (isRelevant) {
      scripts.push({
        type: 'meta_tag',
        value: `${name}:${content}`,
      })
    }
  })

  // 4. Extract iframes (booking widgets, embeds)
  $('iframe[src]').each((_, el) => {
    const src = $(el).attr('src')
    if (!src) return

    scripts.push({
      type: 'iframe',
      value: src,
    })
  })

  // Single consolidated debug log with all extraction results
  logger.debug({
    msg: `[Technology Detection] Extracted ${scripts.length} signals from ${url}`,
    event: 'scripts_extracted',
    metadata: {
      url,
      htmlLength: html.length,
      totalScripts: scripts.length,
      byType: {
        scriptUrls: scripts.filter((s) => s.type === 'script_url').length,
        inlineScripts: scripts.filter((s) => s.type === 'inline_code').length,
        metaTags: scripts.filter((s) => s.type === 'meta_tag').length,
        iframes: scripts.filter((s) => s.type === 'iframe').length,
      },
      samples: scripts.slice(0, LOG_SAMPLE_COUNT).map((s) => ({
        type: s.type,
        value: s.value.substring(0, LOG_SAMPLE_MAX_LENGTH),
      })),
    },
  })

  return scripts
}
