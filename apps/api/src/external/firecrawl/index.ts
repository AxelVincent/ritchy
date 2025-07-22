import FirecrawlApp, {
  type ScrapeResponse,
  type CrawlScrapeOptions
} from '@mendable/firecrawl-js'
import { FIRECRAWL_CONFIG } from '../../config/firecrawl'

export const getFirecrawlClient = () => {
  return new FirecrawlApp({ apiKey: FIRECRAWL_CONFIG.API_KEY })
}

export const scrapeWebsite = async (
  url: string,
  options: CrawlScrapeOptions = {
    formats: ['markdown', 'html']
  }
) => {
  const app = getFirecrawlClient()
  const scrapeResult = await app.scrapeUrl(url, options)

  if (!scrapeResult.success) {
    throw new Error(`Failed to scrape: ${scrapeResult.error}`)
  }

  return scrapeResult
}
