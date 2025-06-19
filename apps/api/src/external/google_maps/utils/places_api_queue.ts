import { logger } from '@ritchy/logger'
import { createApiQueue } from '../../utils/api_queue'
import { googlePlacesRateLimiter } from '../../utils/rate_limiter/config'

/**
 * Shared API queue for all Google Places API requests
 * Ensures rate limiting is properly coordinated across different endpoints
 */
export const placesApiQueue = createApiQueue(googlePlacesRateLimiter, {
  maxRetries: 3,
  defaultPriority: 0,
  onError: (error) => {
    logger.error({
      msg: 'API request failed',
      event: 'api_request_failed',
      metadata: { error },
    })
  },
})
