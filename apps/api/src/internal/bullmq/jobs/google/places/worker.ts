import { logger } from '@ritchy/logger'
import type { GeocodeRequestParams } from '@ritchy/types'
import type { AutocompleteRequestBody } from '@ritchy/types'
import { Worker } from 'bullmq'
import { postAutocompleteV1 } from '../../../../../external/google_maps/autocomplete_V1'
import { getGeocodeV1 } from '../../../../../external/google_maps/geocode_V1'
import { fetchPlaceDetails } from '../../../../../external/google_maps/place_details_V1'
import { fetchSinglePage } from '../../../../../external/google_maps/text_search_V1'
import type { GooglePlacesTextSearchRequestBody } from '../../../../../external/google_maps/types'
import { bullmqRedisOptions } from '../../../config'

// Define job types for type safety
type GooglePlacesJobData =
  | { type: 'textSearch'; data: GooglePlacesTextSearchRequestBody }
  | { type: 'geocode'; data: GeocodeRequestParams }
  | { type: 'autocomplete'; data: AutocompleteRequestBody }
  | { type: 'placeDetails'; data: { googlePlaceId: string } }

const googlePlacesWorker = new Worker(
  'google-places-api',
  async (job) => {
    try {
      const { type, data } = job.data as GooglePlacesJobData

      switch (type) {
        case 'textSearch':
          return await fetchSinglePage(data)

        case 'geocode':
          return await getGeocodeV1(data)

        case 'autocomplete':
          return await postAutocompleteV1(data)

        case 'placeDetails':
          return await fetchPlaceDetails(data.googlePlaceId)

        default:
          throw new Error(`Unknown job type: ${type}`)
      }
    } catch (error) {
      logger.error({
        msg: 'Google Places API job failed',
        event: 'google_places_job_error',
        metadata: {
          jobId: job.id,
          jobType: (job.data as GooglePlacesJobData).type,
          error: error instanceof Error ? error.message : String(error),
        },
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
  {
    connection: bullmqRedisOptions,
    limiter: {
      max: 600,
      duration: 60000,
    },
    concurrency: 50,
  },
)

googlePlacesWorker.on('completed', (job) => {
  const jobType = (job.data as GooglePlacesJobData).type
  logger.info({
    msg: 'Google Places API job completed',
    event: 'google_places_job_success',
    metadata: { jobId: job.id, jobType },
  })
})

googlePlacesWorker.on('failed', (job, err) => {
  const jobType = job?.data ? (job.data as GooglePlacesJobData).type : 'unknown'
  logger.error({
    msg: 'Google Places API job failed',
    event: 'google_places_job_failure',
    metadata: { jobId: job?.id, jobType, error: err.message },
  })
})
