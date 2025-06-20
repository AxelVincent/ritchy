import { logger } from '@ritchy/logger'
import type { GeocodeRequestParams, GeocodeResult } from '@ritchy/types'
import { GOOGLE_MAPS_CONFIG } from '../../config/google_maps'
import { REDIS_KEYS } from '../../lib/redis/keys'
import { redisClient } from '../../lib/redis/redis'

export async function getGeocodeV1(
  params: GeocodeRequestParams,
): Promise<GeocodeResult> {
  const startTime = Date.now()

  // Validate place ID
  if (!params.placeId) {
    throw new Error('Place ID is required')
  }

  const key = REDIS_KEYS.geocode(params.placeId)

  const cachedResult = await redisClient.get<GeocodeResult>(key)

  if (cachedResult) {
    logger.info({
      msg: 'Geocode cache hit',
      event: 'geocode_cache_hit',
      metadata: { placeId: params.placeId },
    })
    return cachedResult.data
  }

  try {
    if (!GOOGLE_MAPS_CONFIG.GEOCODING_API_KEY) {
      throw new Error('Google Maps Geocoding API key is not configured')
    }

    const url = new URL(`${GOOGLE_MAPS_CONFIG.MAPS_URL}/maps/api/geocode/json`)
    url.searchParams.append('place_id', params.placeId)
    url.searchParams.append('key', GOOGLE_MAPS_CONFIG.GEOCODING_API_KEY)

    logger.debug({
      msg: 'Geocoding API request',
      event: 'geocode_request',
      metadata: {
        url: url
          .toString()
          .replace(GOOGLE_MAPS_CONFIG.GEOCODING_API_KEY, '[REDACTED]'),
        placeId: params.placeId,
      },
    })

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const responseBody = await response.text()
      let errorData: { error_message: string }
      try {
        errorData = JSON.parse(responseBody)
      } catch {
        errorData = { error_message: responseBody }
      }

      logger.error({
        msg: 'Google Geocode API Error',
        event: 'google_geocode_error',
        metadata: {
          errorData,
          placeId: params.placeId,
          statusCode: response.status,
          durationMs: Date.now() - startTime,
          responseBody,
        },
      })
      throw new Error(
        `Google API error: ${response.status} - ${errorData.error_message || 'Unknown error'}`,
      )
    }

    const data = await response.json()

    if (data.status !== 'OK' || !data.results?.[0]) {
      throw new Error('No results found')
    }

    await redisClient.set(key, data.results[0])

    logger.info({
      msg: 'Google Geocode API Success',
      event: 'google_geocode_success',
      metadata: {
        placeId: params.placeId,
        durationMs: Date.now() - startTime,
      },
    })

    return data.results[0]
  } catch (error) {
    logger.error({
      msg: 'Geocode failed',
      event: 'geocode_error',
      metadata: {
        error:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
              }
            : error,
        placeId: params.placeId,
      },
    })
    throw error
  }
}
