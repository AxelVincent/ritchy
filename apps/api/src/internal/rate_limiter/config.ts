import { createRateLimiter } from '.'
import { WHOIS_CONFIG } from '../../config/whois'
import { createApiQueue } from './api_queue/api_queue'

/**
 * Pre-configured rate limiter for Google Places API
 * Limits requests to 600 per minute as per Google Places API requirements
 * Both capacity and refill rate are set to 600/minute (10/second)
 * Note: Google's quota resets every minute, while this provides a rolling window
 */
const placesName = 'places_api'
export const placesApiQueue = createApiQueue({
  name: placesName,
  rateLimiter: createRateLimiter({
    refillRate: 600 / 60,
    capacity: 600,
    name: placesName,
  }),
  concurrency: 10,
})

/**
 * Pre-configured rate limiter for HubSpot API
 * Limits requests to 110 per 10 seconds as per HubSpot OAuth app requirements
 * Both capacity and refill rate are set to 11/second (110/10)
 * Note: This is a per-account limit for OAuth apps, excluding Search API
 */
const hubspotName = 'hubspot_api'
export const hubspotApiQueue = createApiQueue({
  name: hubspotName,
  rateLimiter: createRateLimiter({
    refillRate: 11,
    capacity: 110,
    name: hubspotName,
  }),
  concurrency: 10,
})

/**
 * Pre-configured rate limiter for Firecrawl API
 * Limits requests to 500 per minute as per Firecrawl API requirements
 * Both capacity and refill rate are set to 500/minute
 */
const firecrawlName = 'firecrawl_api'
export const firecrawlApiQueue = createApiQueue({
  name: firecrawlName,
  rateLimiter: createRateLimiter({
    refillRate: 500 / 60,
    capacity: 500,
    name: firecrawlName,
  }),
  concurrency: 100,
})

/**
 * Pre-configured rate limiter for WHOIS API
 * Limits requests to 50 per second as per WHOIS API requirements
 * Both capacity and refill rate are set to 50/second
 */
const whoIsName = 'whois_api'
export const whoisApiQueue = createApiQueue({
  name: whoIsName,
  rateLimiter: createRateLimiter({
    refillRate: WHOIS_CONFIG.RATE_LIMIT.REQUESTS_PER_SECOND,
    capacity: WHOIS_CONFIG.RATE_LIMIT.BURST_CAPACITY,
    name: whoIsName,
  }),
  concurrency: 50,
})
