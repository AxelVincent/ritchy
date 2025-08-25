import { createRateLimiter } from '.'
import { createApiQueue } from './api_queue/api_queue'
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
