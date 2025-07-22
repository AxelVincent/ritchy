import { getMainDomain } from './utils/get_main_domain'
import { isValidUrl } from '../../utils/is_valid_url'
import * as cheerio from 'cheerio'
import { normalizeInstagram } from './utils/normalize_instagram'
import { resolveUrl } from './utils/resolve_url'
import { isFile } from './utils/is_file'
import { isImage } from './utils/is_image'
import { extractContactsFromText } from './utils/extract_contacts_from_text'
import { scrapeWebsite } from '../../external/firecrawl'
import { logger } from '@ritchy/logger'
import { cleanUrl } from './utils/clean_url'

type ScrapeResult = {
  html: string
  markdown: string
  links: Links
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
  url: string
): Promise<ScrapeResult> => {
  const { html, markdown, success, error } = await scrapeWebsite(url)

  if (!success) {
    logger.error({
      msg: 'Failed to scrape website',
      event: 'scrape_website_failed',
      metadata: { url, error }
    })
    throw new Error('Failed to scrape website')
  }

  if (!html || !markdown) {
    logger.error({
      msg: 'No response returned from scrape',
      event: 'scrape_website_no_response',
      metadata: { url }
    })
    throw new Error('No response returned from scrape')
  }

  const mainDomain = getMainDomain(url)
  const $ = cheerio.load(html)

  // Use Sets to ensure uniqueness in each category
  const uniqueLinks = {
    emails: new Set<string>(),
    phones: new Set<string>(),
    external: new Set<string>(),
    internal: new Set<string>(),
    socials: {
      facebook: new Set<string>(),
      instagram: new Set<string>(),
      linkedin: new Set<string>()
    },
    files: new Set<string>(),
    images: new Set<string>()
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

  $('a').each((_, element) => {
    const $link = $(element)
    let href = $link.attr('href') || ''

    href = cleanUrl(resolveUrl(url, href))

    if (href.startsWith('mailto:')) {
      uniqueLinks.emails.add(href.replace('mailto:', ''))
      return
    }

    if (href.startsWith('tel:')) {
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
        uniqueLinks.socials.instagram.add(cleanInstagram.url)
      }
      return
    }

    if (href.includes('facebook.com')) {
      uniqueLinks.socials.facebook.add(href)
      return
    }

    if (href.includes('linkedin.com')) {
      uniqueLinks.socials.linkedin.add(href)
      return
    }

    if (href.includes(mainDomain)) {
      uniqueLinks.internal.add(href)
      return
    }

    uniqueLinks.external.add(href)
  })

  const internalLinks = Array.from(uniqueLinks.internal).filter(
    (internalUrl) => internalUrl !== cleanUrl(url)
  )

  return {
    html,
    markdown,
    links: {
      emails: Array.from(uniqueLinks.emails),
      phones: Array.from(uniqueLinks.phones),
      external: Array.from(uniqueLinks.external),
      internal: internalLinks,
      socials: {
        facebook: Array.from(uniqueLinks.socials.facebook),
        instagram: Array.from(uniqueLinks.socials.instagram),
        linkedin: Array.from(uniqueLinks.socials.linkedin)
      },
      files: Array.from(uniqueLinks.files),
      images: Array.from(uniqueLinks.images)
    }
  }
}
