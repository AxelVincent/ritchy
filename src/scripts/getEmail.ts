import * as cheerio from 'cheerio'
import { URL } from 'node:url'

function extractEmails(
  text: string,
  excludeList: string[] = ['sentry', 'datadog']
): string[] {
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  const allEmails = text.match(emailPattern) || []
  return allEmails.filter(
    (email) =>
      !excludeList.some((exclude) =>
        email.toLowerCase().includes(exclude.toLowerCase())
      )
  )
}

function getDomainFromUrl(url: string): string {
  const parsedUrl = new URL(url)
  return parsedUrl.hostname.replace(/^www\./, '')
}

async function getWebsiteContent(
  url: string,
  subdomains: string[] = ['about', 'faq', 'a-propos', 'contact']
): Promise<{
  AIOptimizedText: string
  leadStructuredData: Record<string, unknown>
} | null> {
  try {
    const mainUrl = new URL(url)
    const urlsToFetch = [
      mainUrl.href,
      ...subdomains.map((subdomain) => new URL(`/${subdomain}`, url).href)
    ]

    const responses = await Promise.all(urlsToFetch.map((u) => fetch(u)))

    if (responses.every((response) => !response.ok)) {
      throw new Error(
        `HTTP error! All pages failed. Statuses: ${responses
          .map((r) => r.status)
          .join(', ')}`
      )
    }

    const htmlContents = await Promise.all(
      responses.map((response) => response.text())
    )

    const domain = getDomainFromUrl(url)
    const pageContents = htmlContents.map((html, index) => {
      const $ = cheerio.load(html)
      const elementsToRemove =
        'script, style, nav, header, footer, .menu, #menu, .navigation, #navigation, img, svg, iframe, video, audio, canvas, object, embed'
      $(elementsToRemove).remove()
      const structuredContent = extractStructuredContent($)
      const emails = extractEmails(html)
      const emailMatchWithDomainName = findEmailMatchWithDomainName(
        emails,
        domain
      )
      return {
        ...structuredContent,
        url: urlsToFetch[index],
        emails,
        emailMatchWithDomainName
      }
    })

    const leadStructuredData = {
      title: pageContents.find((content) => content.title)?.title || '',
      description:
        pageContents.find((content) => content.description)?.description || '',
      pageContents: pageContents.map((content) => ({
        url: content.url,
        content: content.content
      })),
      emails: [...new Set(pageContents.flatMap((content) => content.emails))],
      emailMatchWithDomainName:
        pageContents.find((content) => content.emailMatchWithDomainName)
          ?.emailMatchWithDomainName || null
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
      `
        )
        .join('\n')}
    `
      .trim()
      .replace(/\n\s+/g, '\n')

    return { AIOptimizedText, leadStructuredData }
  } catch (error) {
    console.error(`Error fetching content from ${url}:`, error)
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
  domain: string
): string | null {
  return (
    emails.find((email) =>
      email.toLowerCase().includes(domain.toLowerCase())
    ) || null
  )
}

export async function scrapeLeadDataFromWebsiteUrl(url: string): Promise<{
  AIOptimizedText: string
  leadStructuredData: Record<string, unknown>
} | null> {
  try {
    const websiteContent = await getWebsiteContent(url)

    return websiteContent
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`)
      return null
    }
    console.log('An unknown error occurred')
    return null
  }
}

// // Main execution
// if (process.argv.length !== 3) {
//   console.log('Usage: ts-node scrapeEmail.ts <website_url>')
//   process.exit(1)
// }

// const websiteUrl = process.argv[2]
// scrapeContactEmail(websiteUrl)
//   .then((email) => console.log(`Contact email: ${email}`))
//   .catch((error) => console.error(error))
