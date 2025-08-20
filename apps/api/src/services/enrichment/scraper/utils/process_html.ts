import { logger } from '@ritchy/logger'
import * as cheerio from 'cheerio'
import createDOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'
import { htmlToMarkdown } from './html_to_markdown'

export type ProcessedHtml = {
  sanitizedHtml: string
  cleanedHtml: string
  markdown: string
}

/**
 * Processes raw HTML by removing unwanted elements, sanitizing it, and converting to markdown
 * Includes proper JSDOM disposal to prevent memory leaks
 * Preserves links in main content areas and social share sections
 */
export const processHtml = (html: string, url?: string): ProcessedHtml => {
  let dom: JSDOM | null = null
  const maxHtmlSize = 1 * 1024 * 1024 // 1MB
  if (html.length > maxHtmlSize) {
    logger.error({
      msg: `[Process HTML] HTML size exceeds limit for ${url}`,
      event: 'process_html_html_size_exceeded',
      metadata: { url, htmlSize: html.length },
    })
    throw new Error('HTML size exceeds limit')
  }

  try {
    const $ = cheerio.load(html)

    // Remove unwanted elements FIRST (while class attributes still exist)
    $(
      'script, style, iframe, noscript, object, embed, canvas, video, audio, input, textarea, .ads, .advertisement, .comments',
    ).remove()

    // Then remove attributes to reduce memory footprint, but preserve href
    $('*').removeAttr(
      'style class id onload onerror data-* onclick onmouseover onsubmit',
    )

    const preProcessedHtml = $.html()

    // Create minimal JSDOM instance (don't load the full HTML)
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url })
    const DOMPurify = createDOMPurify(dom.window)

    const sanitizedHtml = DOMPurify.sanitize(preProcessedHtml, {
      FORBID_TAGS: [
        'script',
        'style',
        'iframe',
        'frame',
        'object',
        'embed',
        'form',
        'input',
        'button',
        'img',
      ],
      FORBID_ATTR: [
        'onerror',
        'onload',
        'onclick',
        'onmouseover',
        'onsubmit',
        'style',
        'class',
      ],
      ALLOW_DATA_ATTR: false,
      USE_PROFILES: { html: true },
    })

    // Reuse the same Cheerio instance instead of loading again
    $.root().empty().append(sanitizedHtml)

    const cleanedHtml = $.html()
    const markdown = htmlToMarkdown(cleanedHtml)

    return {
      sanitizedHtml,
      cleanedHtml,
      markdown,
    }
  } catch (error) {
    logger.error({
      msg: `[Process HTML] Error processing HTML for ${url}`,
      event: 'process_html_error',
      metadata: { url, error },
    })
    throw error
  } finally {
    if (dom?.window) {
      dom.window.close()
    }

    if (global.gc) {
      global.gc()
    }
  }
}
