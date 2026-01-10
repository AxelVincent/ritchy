import { createSemaphore } from '../../../../internal/redis/semaphore'

const FIRECRAWL_MAX_CONCURRENT = 50

export const firecrawlSemaphore = createSemaphore(
  'scraper:firecrawl',
  FIRECRAWL_MAX_CONCURRENT,
)
