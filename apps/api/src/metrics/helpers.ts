import { startDurationTimer } from '@ritchy/metrics'
import {
  externalApiDurationHistogram,
  externalApiRequestsCounter,
} from './collectors'

/**
 * Simplified wrapper to track external API calls with automatic error handling
 *
 * Usage:
 * ```typescript
 * return await trackExternalApi('icypeas', 'email_search', async () => {
 *   const response = await fetch(...)
 *   return { response, data: await response.json() }
 * })
 * ```
 */
export const trackExternalApi = async <T>(
  service: string,
  endpoint: string,
  apiFn: () => Promise<{ response: Response; data: T }>,
): Promise<T> => {
  const timer = startDurationTimer(externalApiDurationHistogram)
  let statusCode = '500'

  try {
    const { response, data } = await apiFn()
    statusCode = response.status.toString()

    timer.stop({ service, endpoint })
    externalApiRequestsCounter.inc({
      service,
      endpoint,
      status_code: statusCode,
    })

    return data
  } catch (error) {
    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      statusCode = '408'
    }

    timer.stop({ service, endpoint })
    externalApiRequestsCounter.inc({
      service,
      endpoint,
      status_code: statusCode,
    })

    throw error
  }
}

/**
 * Track external API with explicit status code control
 * For cases where you need to handle errors before tracking
 */
export const withExternalApiMetrics = (
  service: string,
  endpoint: string,
  statusCode: string,
) => {
  const timer = startDurationTimer(externalApiDurationHistogram)
  let currentStatusCode = statusCode

  return {
    stop: () => {
      timer.stop({ service, endpoint })
      externalApiRequestsCounter.inc({
        service,
        endpoint,
        status_code: currentStatusCode,
      })
    },
    updateStatus: (newStatus: string) => {
      currentStatusCode = newStatus
    },
  }
}
