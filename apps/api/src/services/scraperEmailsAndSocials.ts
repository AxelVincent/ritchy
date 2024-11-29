import { SOCIAL_MEDIA_CONFIG } from '@ritchy/types'
import * as cheerio from 'cheerio'
import { XMLParser } from 'fast-xml-parser'
import pLimit from 'p-limit'

// Constants
const POTENTIAL_SUBPAGES = [
  '/contact',
  '/about',
  '/team',
  '/support',
  '/help',
  '/faq',
  '/legal',
  '/terms',
  '/privacy',
  '/impressum',
  '/careers',
  '/jobs',
  '/get-in-touch',
  '/reach-us'
]

type SocialMediaPlatform = keyof typeof SOCIAL_MEDIA_CONFIG

const SOCIAL_MEDIA_DOMAINS = Object.values(SOCIAL_MEDIA_CONFIG).map(
  (config) => config.domain
)

const IS_DEBUG = true

// Type definitions
type ScraperResult = {
  emails: string[]
  socialLinks: Record<string, string[]>
  error?: string
}

/**
 * Fetch URLs from a sitemap
 * @param sitemapUrl - The URL to the sitemap.xml
 * @returns - A list of URLs found in the sitemap
 */
async function getPagesFromSitemap(sitemapUrl: string): Promise<string[]> {
  try {
    const response = await fetch(sitemapUrl)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const data = await response.text()
    const xmlParser = new XMLParser()
    const sitemap = xmlParser.parse(data)

    const urls: string[] = []
    const urlSet = sitemap.urlset?.url
    if (Array.isArray(urlSet)) {
      urls.push(...urlSet.map((entry) => entry.loc))
    } else if (urlSet?.loc) {
      urls.push(urlSet.loc)
    }

    return urls
  } catch (error) {
    console.error('Error fetching sitemap:', (error as Error).message)
    return []
  }
}

/**
 * Filter sitemap URLs based on potential subpages
 * @param sitemapUrls - List of URLs from the sitemap
 * @param baseUrl - The website base URL
 * @param potentialSubpages - List of predefined subpage paths
 * @returns - Filtered list of URLs
 */
function filterRelevantUrls(
  sitemapUrls: string[],
  baseUrl: string,
  potentialSubpages: string[]
): string[] {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '')

  if (sitemapUrls.length === 0) {
    // Include base URL along with subpages
    return [
      normalizedBaseUrl,
      ...potentialSubpages.map((subpage) => `${normalizedBaseUrl}${subpage}`)
    ]
  }

  const baseDomain = new URL(baseUrl).origin

  // Include base URL along with filtered subpages
  return [
    normalizedBaseUrl,
    ...sitemapUrls.filter((url) => {
      const path = url.replace(baseDomain, '').replace(/\/+/g, '/')
      return potentialSubpages.includes(path)
    })
  ]
}

/**
 * Extract emails and social links from a page
 * @param url - The target page URL
 * @param socialMediaDomains - A list of social media domains to detect
 * @returns - A list of emails and social links found on the page
 */
async function scrapeEmailsAndSocials(
  url: string,
  socialMediaDomains: string[]
): Promise<ScraperResult> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()
    if (typeof html !== 'string') {
      throw new Error('Invalid HTML content received')
    }

    const $ = cheerio.load(html)
    if (!$) {
      throw new Error('Failed to initialize Cheerio')
    }

    // Extract emails
    const mailtoLinks: string[] = []
    $("a[href^='mailto:']").each((_index, element) => {
      const email = $(element)
        .attr('href')
        ?.replace('mailto:', '')
        .split('?')[0] // Remove query parameters
        .trim()
      if (email) mailtoLinks.push(email)
    })

    // More strict email regex that avoids matching URLs
    const emailRegex = /(?:[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g

    // Helper function to validate email format
    const isValidEmail = (email: string): boolean => {
      // Additional validation to exclude common false positives
      if (
        email.includes('//') || // URLs
        email.includes('/') || // File paths
        email.includes('\\') || // File paths
        email.includes('sentry') || // Sentry URLs
        email.includes('static.') || // Static assets
        email.includes('unpkg') || // Package URLs
        /\.(png|jpg|jpeg|gif|svg|webp|ico|pdf)$/i.test(email) || // Image and document files
        email.includes('@2x') || // Image scale patterns
        email.includes('@3x') || // Image scale patterns
        email.includes('@4x') // Image scale patterns
      ) {
        return false
      }
      return true
    }

    // Look for emails in text content and data attributes
    const textContent = $('body').text()
    const dataAttributes = $('*')
      .map((_i, el) => Object.values($(el).data()))
      .get()
      .join(' ')

    const matchedEmails = [
      ...(html.match(emailRegex) || []),
      ...(textContent.match(emailRegex) || []),
      ...(dataAttributes.match(emailRegex) || [])
    ].filter(isValidEmail)

    const emails = Array.from(new Set([...mailtoLinks, ...matchedEmails]))

    // Extract social media links
    const socialLinks: Record<string, string[]> = {}

    // Look for social links in href, data attributes, and meta tags
    $('a[href], [data-href], meta[content*="http"], a').each(
      (_index, element) => {
        const links = [
          $(element).attr('href'),
          $(element).data('href'),
          $(element).attr('content')
        ].filter(Boolean) as string[]

        for (const link of links) {
          const normalizedLink = link.toLowerCase()
          for (const domain of socialMediaDomains) {
            if (normalizedLink.includes(domain)) {
              if (!socialLinks[domain]) {
                socialLinks[domain] = []
              }
              // Ensure the link is absolute
              const absoluteLink = link.startsWith('http')
                ? link
                : new URL(link, url).toString()
              socialLinks[domain].push(absoluteLink)
            }
          }
        }
      }
    )

    // Look for social usernames in common patterns
    const usernamePatterns = [
      /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,15})/g, // Twitter usernames are max 15 chars
      /(?:facebook\.com|fb\.com)\/(?!pages\/)([a-zA-Z0-9.]{5,50})/g, // Exclude "pages/" prefix
      /(?:instagram\.com)\/([a-zA-Z0-9._]{1,30})\/?$/g, // Instagram usernames
      /(?:linkedin\.com\/(?:in|company)\/[a-zA-Z0-9-]{3,100})/g // LinkedIn profiles/companies
    ]

    const invalidUsernames = [
      'font',
      'license',
      'keyframes',
      'media',
      'import',
      'charset',
      'layer'
    ]
    const textWithUsernames = $('body').text()
    for (const pattern of usernamePatterns) {
      const matches = textWithUsernames.match(pattern)
      if (matches) {
        for (const match of matches) {
          // Skip CSS-related and other invalid matches
          if (invalidUsernames.some((invalid) => match.includes(invalid))) {
            continue
          }

          const domain = match.includes('facebook')
            ? 'facebook.com'
            : match.includes('instagram')
              ? 'instagram.com'
              : match.includes('linkedin')
                ? 'linkedin.com'
                : 'twitter.com'

          if (!socialLinks[domain]) {
            socialLinks[domain] = []
          }
          socialLinks[domain].push(match.trim())
        }
      }
    }

    // Deduplicate social links
    for (const domain in socialLinks) {
      socialLinks[domain] = Array.from(new Set(socialLinks[domain]))
    }

    return { emails, socialLinks }
  } catch (error) {
    if (IS_DEBUG) {
      console.error(`Error scraping ${url}:`, error)
    }

    // Modified error handling since we're not using axios anymore
    if (error instanceof TypeError) {
      return {
        emails: [],
        socialLinks: {},
        error: 'Network error'
      }
    }

    if (error instanceof Error && error.message.includes('HTTP error!')) {
      const status = error.message.match(/status: (\d+)/)?.[1]
      return {
        emails: [],
        socialLinks: {},
        error: status ? `Failed to fetch (${status})` : 'HTTP error'
      }
    }

    return {
      emails: [],
      socialLinks: {},
      error: 'Failed to parse page'
    }
  }
}

/**
 * Scrape emails and social links with concurrency, using optimized URL filtering
 * @param baseUrl - The website base URL
 * @param concurrencyLimit - The maximum number of concurrent requests
 * @param sitemapUrl - The URL to the sitemap.xml
 * @returns - Combined emails and social links across all relevant subpages
 */
const mapSocialLinks = (
  socialLinks: Record<string, string[]>
): Record<SocialMediaPlatform, string[]> => {
  const mapped: Partial<Record<SocialMediaPlatform, string[]>> = {}

  for (const [domain, links] of Object.entries(socialLinks)) {
    const platform = domain.split('.')[0] as SocialMediaPlatform
    if (links.length > 0) {
      mapped[platform] = links
    }
  }

  return mapped as Record<SocialMediaPlatform, string[]>
}

async function scrapeFromOptimizedUrls(
  baseUrl: string,
  concurrencyLimit = 5
): Promise<{
  emails: string[]
  socialLinks: Record<SocialMediaPlatform, string[]>
}> {
  const sitemapUrl = `${baseUrl}/sitemap.xml`
  if (IS_DEBUG) {
    console.log(`Fetching sitemap from ${sitemapUrl}`)
  }
  const sitemapUrls = await getPagesFromSitemap(sitemapUrl)

  const relevantUrls = filterRelevantUrls(
    sitemapUrls,
    baseUrl,
    POTENTIAL_SUBPAGES
  )
  console.log(`Filtered ${relevantUrls.length} relevant URLs from sitemap.`)

  const allEmails: Set<string> = new Set()
  const allSocialLinks: Record<string, Set<string>> = {}

  const limit = pLimit(concurrencyLimit)

  // Scrape relevant URLs
  const tasks = relevantUrls.map((url) =>
    limit(async () => {
      if (IS_DEBUG) {
        console.log(`Scraping page: ${url}`)
      }
      const { emails, socialLinks, error } = await scrapeEmailsAndSocials(
        url,
        SOCIAL_MEDIA_DOMAINS
      )

      if (error && IS_DEBUG) {
        console.error(`Error scraping ${url}:`, error)
      }

      if (!error) {
        for (const email of emails) {
          allEmails.add(email)
        }

        for (const domain in socialLinks) {
          if (!allSocialLinks[domain]) {
            allSocialLinks[domain] = new Set()
          }
          for (const link of socialLinks[domain]) {
            allSocialLinks[domain].add(link)
          }
        }
      }
    })
  )

  await Promise.all(tasks)

  const aggregatedSocialLinks: Record<string, string[]> = {}
  for (const domain in allSocialLinks) {
    aggregatedSocialLinks[domain] = Array.from(allSocialLinks[domain])
  }

  return {
    emails: Array.from(allEmails),
    socialLinks: mapSocialLinks(aggregatedSocialLinks)
  }
}

// // Example usage
// ;(async () => {
//   const baseUrl = 'https://www.lerempartbastille.fr/'

//   const { emails, socialLinks } = await scrapeFromOptimizedUrls(baseUrl, 5)

//   console.log('Emails found:', emails)
//   console.log('Social Links found:', socialLinks)
// })()

export { scrapeEmailsAndSocials, scrapeFromOptimizedUrls }
