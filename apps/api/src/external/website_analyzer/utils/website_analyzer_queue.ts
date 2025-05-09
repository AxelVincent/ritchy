import { logger } from '@ritchy/logger'
import { createApiQueue } from '../../utils/api_queue'
import { websiteAnalysisRateLimiter } from '../../utils/rate_limiter'

/**
 * Shared API queue for all Website Analyzer requests
 * Ensures rate limiting is properly coordinated across different endpoints
 */
export const websiteAnalyzerQueue = createApiQueue(websiteAnalysisRateLimiter, {
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
