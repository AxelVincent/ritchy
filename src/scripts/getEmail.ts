import * as cheerio from 'cheerio'
import { URL } from 'node:url'

function extractEmails(text: string): string[] {
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  return text.match(emailPattern) || []
}

function getDomainFromUrl(url: string): string {
  const parsedUrl = new URL(url)
  return parsedUrl.hostname.replace(/^www\./, '')
}

async function getWebsiteContent(url: string): Promise<string> {
  try {
    const mainUrl = new URL(url)
    const aboutUrl = new URL('/about', url)

    const [mainResponse, aboutResponse] = await Promise.all([
      fetch(mainUrl.href),
      fetch(aboutUrl.href)
    ])

    if (!mainResponse.ok && !aboutResponse.ok) {
      throw new Error(
        `HTTP error! Main page status: ${mainResponse.status}, About page status: ${aboutResponse.status}`
      )
    }

    const [mainHtml, aboutHtml] = await Promise.all([
      mainResponse.text(),
      aboutResponse.text()
    ])

    const $main = cheerio.load(mainHtml)
    const $about = cheerio.load(aboutHtml)

    // Remove script, style, and navigation elements from both pages
    $main(
      'script, style, nav, header, footer, .menu, #menu, .navigation, #navigation'
    ).remove()
    $about(
      'script, style, nav, header, footer, .menu, #menu, .navigation, #navigation'
    ).remove()

    // Extract structured content from both pages
    const mainContent = extractStructuredContent($main)
    const aboutContent = extractStructuredContent($about)

    // Combine the structured content from both pages
    const combinedContent = {
      title: mainContent.title || aboutContent.title,
      description: mainContent.description || aboutContent.description,
      mainPageContent: mainContent.content,
      aboutPageContent: aboutContent.content
    }

    // Convert the structured content to a string optimized for LLMs
    const optimizedText = `
      Website: ${url}
      Title: ${combinedContent.title}
      Description: ${combinedContent.description}
      
      Main Page Content:
      ${combinedContent.mainPageContent}
      
      About Page Content:
      ${combinedContent.aboutPageContent}
    `
      .trim()
      .replace(/\n\s+/g, '\n')

    return optimizedText
  } catch (error) {
    console.error(`Error fetching content from ${url}:`, error)
    return ''
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

async function scrapePageForEmail(
  url: string,
  domain: string
): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const html = await response.text()
    const emails = extractEmails(html)
    return findMatchingEmail(emails, domain)
  } catch (error) {
    console.error(`Error scraping ${url}: ${error}`)
    return null
  }
}

function findMatchingEmail(emails: string[], domain: string): string | null {
  return (
    emails.find((email) =>
      email.toLowerCase().includes(domain.toLowerCase())
    ) || null
  )
}

export async function scrapeContactEmail(url: string): Promise<string | null> {
  try {
    const domain = getDomainFromUrl(url)

    const websiteContent = await getWebsiteContent(url)
    console.log('websiteContent ->', url, websiteContent)

    // Fetch the main page
    const mainPageEmail = await scrapePageForEmail(url, domain)
    if (mainPageEmail) {
      return mainPageEmail
    }

    // If no email found on main page, check the /contact page
    const contactUrl = new URL('/contact', url).href
    const contactPageEmail = await scrapePageForEmail(contactUrl, domain)
    if (contactPageEmail) {
      return contactPageEmail
    }

    // If still no email found, look for other contact links
    const response = await fetch(url)
    const html = await response.text()
    const $ = cheerio.load(html)
    const contactLinks = $('a').filter((_, element) => {
      return (
        /contact/i.test($(element).text()) &&
        $(element).attr('href') !== undefined
      )
    })
    for (let i = 0; i < contactLinks.length; i++) {
      const href = $(contactLinks[i]).attr('href')
      if (href) {
        const linkUrl = new URL(href, url).href
        const linkPageEmail = await scrapePageForEmail(linkUrl, domain)
        if (linkPageEmail) {
          return linkPageEmail
        }
      }
    }

    console.log('No matching email found')
    return null
  } catch (error) {
    if (error instanceof Error) {
      return `Error: ${error.message}`
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
