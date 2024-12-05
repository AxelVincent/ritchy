import { URL } from 'node:url'
import { logger } from '@ritchy/logger'
import * as cheerio from 'cheerio'

function extractEmails(
  text: string,
  excludeList: string[] = ['sentry', 'datadog'],
): string[] {
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  const imagePattern = /\.(png|jpe?g|gif|bmp|webp)$/i
  const allMatches = text.match(emailPattern) || []
  const validEmails = allMatches.filter((match) => !imagePattern.test(match))
  return validEmails.filter(
    (email) =>
      !excludeList.some((exclude) =>
        email.toLowerCase().includes(exclude.toLowerCase()),
      ),
  )
}

function getDomainFromUrl(url: string): string {
  const parsedUrl = new URL(url)
  return parsedUrl.hostname.replace(/^www\./, '')
}

type LeadStructuredData = {
  title: string
  description: string
  emails: Array<{
    email: string
    isMatchingDomain: boolean
  }>
}

async function getWebsiteContent(
  url: string,
  subdomains: string[] = ['about', 'faq', 'a-propos', 'contact'],
): Promise<{
  AIOptimizedText: string
  leadStructuredData: LeadStructuredData
} | null> {
  try {
    const mainUrl = new URL(url)
    const urlsToFetch = [
      mainUrl.href,
      ...subdomains.map((subdomain) => new URL(`/${subdomain}`, url).href),
    ]

    const responses = await Promise.all(urlsToFetch.map((u) => fetch(u)))

    if (responses.every((response) => !response.ok)) {
      throw new Error(
        `HTTP error! All pages failed. Statuses: ${responses
          .map((r) => r.status)
          .join(', ')}`,
      )
    }

    const htmlContents = await Promise.all(
      responses.map((response) => response.text()),
    )

    const domain = getDomainFromUrl(url)
    const pageContents = htmlContents.map((html, index) => {
      const $ = cheerio.load(html)
      const elementsToRemove =
        'script, style, nav, header, footer, .menu, #menu, .navigation, #navigation, img, svg, iframe, video, audio, canvas, object, embed'
      $(elementsToRemove).remove()
      const structuredContent = extractStructuredContent($)
      const emails = extractEmails(html)

      return {
        ...structuredContent,
        url: urlsToFetch[index],
        emails,
      }
    })

    const emails = [
      ...new Set(pageContents.flatMap((content) => content.emails)),
    ]
    const emailMatchWithDomainName = findEmailMatchWithDomainName(
      emails,
      domain,
    )

    const leadStructuredData = {
      title: pageContents.find((content) => content.title)?.title || '',
      description:
        pageContents.find((content) => content.description)?.description || '',
      pageContents: pageContents.map((content) => ({
        url: content.url,
        content: content.content,
      })),
      emails: emails.map((email) => ({
        email,
        isMatchingDomain: email === emailMatchWithDomainName,
      })),
    }

    const AIOptimizedText = `
      Website: ${url}
      Title: ${leadStructuredData.title}
      Description: ${leadStructuredData.description}
      
      ${leadStructuredData.pageContents
        .map(
          (page) => `
      ${page.url} Content:
      ${page.content}
      `,
        )
        .join('\n')}
    `
      .trim()
      .replace(/\n\s+/g, '\n')

    return { AIOptimizedText, leadStructuredData }
  } catch (error) {
    logger.error({
      msg: `Error fetching content from ${url}`,
      event: 'fetch_website_content_error',
      metadata: { error },
    })
    return null
  }
}

function extractStructuredContent($: cheerio.CheerioAPI) {
  const title = $('title').text().trim() || $('h1').first().text().trim()
  const description =
    $('meta[name="description"]').attr('content')?.trim() || ''

  // Extract main content, prioritizing specific content areas
  const contentSelectors = ['main', '#content', '.content', 'article', '.post']
  let content = ''
  for (const selector of contentSelectors) {
    content = $(selector).text().trim()
    if (content) break
  }

  // If no specific content area found, use body content
  if (!content) {
    content = $('body').text()
  }

  // Clean up the content
  content = content.replace(/\s+/g, ' ').trim()

  return { title, description, content }
}

function findEmailMatchWithDomainName(
  emails: string[],
  domain: string,
): string | null {
  return (
    emails.find((email) =>
      email.toLowerCase().includes(domain.toLowerCase()),
    ) || null
  )
}

export async function scrapeLeadDataFromWebsiteUrl(url: string): Promise<{
  AIOptimizedText: string
  leadStructuredData: LeadStructuredData
} | null> {
  try {
    const websiteContent = await getWebsiteContent(url)

    return websiteContent
  } catch (error) {
    if (error instanceof Error) {
      logger.error({
        msg: `Error: ${error.message}`,
        event: 'scrape_website_data_error',
        metadata: { error },
      })
      return null
    }
    logger.error({
      msg: 'An unknown error occurred',
      event: 'scrape_website_data_error',
      metadata: { error },
    })
    return null
  }
}
