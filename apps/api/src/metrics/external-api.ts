import { getMetrics } from './singleton'

/**
 * Wrapper to track external API call metrics.
 * Uses auto-initializing singleton - works in API, workers, and sandboxes.
 */
export const trackExternalApiCall = async <T>(
  service: string,
  endpoint: string,
  apiFn: () => Promise<T>,
): Promise<T> => {
  const metrics = getMetrics()
  const startTime = process.hrtime()
  let statusCode = 'unknown'

  try {
    const result = await apiFn()
    statusCode = '200' // Assuming success if no error

    const [seconds, nanoseconds] = process.hrtime(startTime)
    const durationSeconds = seconds + nanoseconds / 1e9

    metrics.externalApiDuration.observe(durationSeconds, { service, endpoint })
    metrics.externalApiRequests.inc({
      service,
      endpoint,
      status_code: statusCode,
    })

    return result
  } catch (error) {
    // Try to extract status code from error
    if (error && typeof error === 'object' && 'statusCode' in error) {
      statusCode = String(error.statusCode)
    } else {
      statusCode = '500'
    }

    const [seconds, nanoseconds] = process.hrtime(startTime)
    const durationSeconds = seconds + nanoseconds / 1e9

    metrics.externalApiDuration.observe(durationSeconds, { service, endpoint })
    metrics.externalApiRequests.inc({
      service,
      endpoint,
      status_code: statusCode,
    })

    throw error
  }
}
