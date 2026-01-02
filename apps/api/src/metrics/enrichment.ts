import {
  createSimpleDurationTimer,
  enrichmentDurationHistogram,
  enrichmentErrorsCounter,
  enrichmentRequestsCounter,
  enrichmentStatusGauge,
} from './collectors'

/**
 * Enrichment sub-processes that can be tracked
 *
 * These represent the granular operations within an enrichment flow:
 *
 * Company enrichment subprocesses:
 * - overall: Complete enrichment operation (cached or not)
 * - scrape_homepage: Initial homepage scraping
 * - scrape_subpages: Additional pages scraping
 * - technology_detection: Website technology detection
 * - governmental_data: Company search in governmental databases
 * - company_officers: Company officers enrichment
 * - website_description: LLM-generated website description
 * - whois_lookup: Domain registration data lookup
 * - email_verification: Email validation via Million Verifier
 * - populate_contacts: Contact generation
 * - calculate_score: Enrichment quality scoring
 *
 * Contact enrichment subprocesses:
 * - linkedin_waterfall: LinkedIn profile discovery
 * - email_waterfall: Email address discovery
 * - phone_waterfall: Phone number discovery
 */
export type EnrichmentSubprocess =
  | 'overall'
  // Company subprocesses
  | 'scrape_homepage'
  | 'scrape_subpages'
  | 'technology_detection'
  | 'governmental_data'
  | 'company_officers'
  | 'website_description'
  | 'whois_lookup'
  | 'email_verification'
  | 'populate_contacts'
  | 'calculate_score'
  // Contact subprocesses
  | 'linkedin_waterfall'
  | 'email_waterfall'
  | 'phone_waterfall'

/**
 * Start tracking an enrichment operation with granular sub-process monitoring
 *
 * This returns a comprehensive tracker that handles all enrichment metrics:
 * - Duration tracking for the overall enrichment and individual sub-processes
 * - Success/failure counting with caching awareness
 * - Error type tracking
 * - Active enrichment gauge management
 *
 * @param enrichmentType - Type of enrichment ('company', 'contact', 'governmental', 'social_media')
 * @param cached - Whether this enrichment is using cached data
 * @returns Enrichment tracker with methods for recording metrics
 *
 * @example
 * ```typescript
 * export const websiteEnrichmentManager = async ({ userPlaceId }) => {
 *   const tracker = startEnrichmentTracking('website', false)
 *
 *   try {
 *     // Track homepage scraping
 *     const result = await tracker.trackSubprocess('scrape_homepage', async () => {
 *       return await scrapeHomepage(url)
 *     })
 *
 *     // Track governmental data enrichment
 *     await tracker.trackSubprocess('governmental_data', async () => {
 *       return await enrichGovernmentalData({ place, enrichmentId })
 *     })
 *
 *     // Mark as successful
 *     tracker.markSuccess()
 *
 *   } catch (error) {
 *     tracker.markFailure(error)
 *     throw error
 *   }
 * }
 * ```
 */
export const startEnrichmentTracking = (
  enrichmentType: 'company' | 'contact' | 'governmental' | 'social_media',
  cached = false,
) => {
  const cachedLabel = cached ? 'true' : 'false'

  // Overall enrichment duration timer
  const overallTimer = createSimpleDurationTimer(enrichmentDurationHistogram)

  // Increment active enrichments (processing status)
  enrichmentStatusGauge.inc({ status: 'processing' })

  let completed = false

  return {
    /**
     * Track a specific sub-process with automatic timing
     *
     * This is the recommended way to track enrichment sub-processes.
     * It automatically handles timing, error tracking, and metric recording.
     *
     * @param subprocess - The sub-process being tracked
     * @param fn - Async function to execute and track
     * @returns Result of the function
     *
     * @example
     * ```typescript
     * const scrapedData = await tracker.trackSubprocess('scrape_homepage', async () => {
     *   return await scrapeHomepage(url)
     * })
     * ```
     */
    trackSubprocess: async <T>(
      subprocess: EnrichmentSubprocess,
      fn: () => Promise<T>,
    ): Promise<T> => {
      const timer = createSimpleDurationTimer(enrichmentDurationHistogram)

      try {
        const result = await fn()
        timer.stop({
          enrichment_type: enrichmentType,
          subprocess,
          cached: cachedLabel,
        })
        return result
      } catch (error) {
        timer.stop({
          enrichment_type: enrichmentType,
          subprocess,
          cached: cachedLabel,
        })
        throw error
      }
    },

    /**
     * Start tracking a specific sub-process (manual timer control)
     *
     * Use this when you need manual control over when the timer starts/stops.
     * For most cases, prefer `trackSubprocess()` instead.
     *
     * @param subprocess - The sub-process being tracked
     * @returns Timer object with stop() method
     *
     * @example
     * ```typescript
     * const timer = tracker.startSubprocess('scrape_homepage')
     * try {
     *   await scrapeHomepage(url)
     *   timer.stop()
     * } catch (error) {
     *   timer.stop()
     *   throw error
     * }
     * ```
     */
    startSubprocess: (subprocess: EnrichmentSubprocess) => {
      const timer = createSimpleDurationTimer(enrichmentDurationHistogram)

      return {
        stop: () => {
          timer.stop({
            enrichment_type: enrichmentType,
            subprocess,
            cached: cachedLabel,
          })
        },
      }
    },

    /**
     * Mark the enrichment as successful
     * Records success metrics and cleans up gauges
     */
    markSuccess: () => {
      if (completed) return

      // Stop overall timer
      overallTimer.stop({
        enrichment_type: enrichmentType,
        subprocess: 'overall',
        cached: cachedLabel,
      })

      // Record successful enrichment
      enrichmentRequestsCounter.inc({
        enrichment_type: enrichmentType,
        status: 'success',
        cached: cachedLabel,
      })

      // Update gauge: decrement processing, increment completed
      enrichmentStatusGauge.dec({ status: 'processing' })
      enrichmentStatusGauge.inc({ status: 'completed' })

      // Auto-decrement completed after 1 minute (to show recent completions)
      setTimeout(() => {
        enrichmentStatusGauge.dec({ status: 'completed' })
      }, 60000)

      completed = true
    },

    /**
     * Mark the enrichment as failed
     * Records failure metrics, error types, and cleans up gauges
     * @param error - Error object or error message
     */
    markFailure: (error: Error | string | unknown) => {
      if (completed) return

      // Stop overall timer
      overallTimer.stop({
        enrichment_type: enrichmentType,
        subprocess: 'overall',
        cached: cachedLabel,
      })

      // Determine error type
      let errorType = 'UnknownError'
      if (error instanceof Error) {
        errorType = error.name || error.constructor.name || 'Error'
      } else if (typeof error === 'string') {
        errorType = 'StringError'
      }

      // Record failed enrichment
      enrichmentRequestsCounter.inc({
        enrichment_type: enrichmentType,
        status: 'failed',
        cached: cachedLabel,
      })

      // Record error type
      enrichmentErrorsCounter.inc({
        enrichment_type: enrichmentType,
        error_type: errorType,
      })

      // Update gauge: decrement processing, increment failed
      enrichmentStatusGauge.dec({ status: 'processing' })
      enrichmentStatusGauge.inc({ status: 'failed' })

      // Auto-decrement failed after 5 minutes (to show recent failures)
      setTimeout(() => {
        enrichmentStatusGauge.dec({ status: 'failed' })
      }, 300000)

      completed = true
    },
  }
}
