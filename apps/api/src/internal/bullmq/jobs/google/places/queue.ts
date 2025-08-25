import type { GeocodeRequestParams, GeocodeResult } from '@ritchy/types'
import type {
  AutocompletePrediction,
  AutocompleteRequestBody,
} from '@ritchy/types'
import { Queue, QueueEvents } from 'bullmq'
import type {
  GooglePlacesTextSearchRequestBody,
  GooglePlacesTextSearchResponse,
  PreferredPlace,
} from '../../../../../external/google_maps/types'
import { bullmqRedisOptions } from '../../../config'

const queueName = 'google-places-api'
export const googlePlacesQueue = new Queue(queueName, {
  connection: bullmqRedisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})

const googlePlacesQueueEvents = new QueueEvents(queueName, {
  connection: bullmqRedisOptions,
})

export const enqueueTextSearchJob = async (
  data: GooglePlacesTextSearchRequestBody,
): Promise<GooglePlacesTextSearchResponse> => {
  const job = await googlePlacesQueue.add('textSearch', {
    type: 'textSearch',
    data,
  })
  return await job.waitUntilFinished(googlePlacesQueueEvents)
}

export const enqueueGeocodeJob = async (
  data: GeocodeRequestParams,
): Promise<GeocodeResult> => {
  const job = await googlePlacesQueue.add('geocode', { type: 'geocode', data })
  return await job.waitUntilFinished(googlePlacesQueueEvents)
}

export const enqueueAutocompleteJob = async (
  data: AutocompleteRequestBody,
): Promise<AutocompletePrediction[]> => {
  const job = await googlePlacesQueue.add('autocomplete', {
    type: 'autocomplete',
    data,
  })
  return await job.waitUntilFinished(googlePlacesQueueEvents)
}

export const enqueuePlaceDetailsJob = async (
  googlePlaceId: string,
): Promise<PreferredPlace> => {
  const job = await googlePlacesQueue.add('placeDetails', {
    type: 'placeDetails',
    data: { googlePlaceId },
  })
  return await job.waitUntilFinished(googlePlacesQueueEvents)
}
