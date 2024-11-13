import 'dotenv/config'
import { GOOGLE_MAPS_CONFIG } from 'src/config/google_maps'
import { getLargestSquareInCircle } from 'src/utils/geo_utils'

import type { PlacesSearchResponse } from '@ritchy/types/src/api/places'
import {
  type TextSearchRequestBody,
  TextSearchRequestBodySchema,
  type TextSearchResponse
} from './types'

function mapToPlacesSearchResult(
  response: TextSearchResponse
): PlacesSearchResponse {
  if (!response.places) return []

  return response.places.map((place) => ({
    id: place.id,
    websiteUri: place.websiteUri || '',
    displayName: place.displayName?.text || '',
    location: {
      latitude: place.location?.latitude || 0,
      longitude: place.location?.longitude || 0
    },
    types: place.types || [],
    formattedAddress: place.formattedAddress || '',
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    shortFormattedAddress: place.shortFormattedAddress,
    googleMapsUri: place.googleMapsUri || '',
    currentOpeningHours: place.currentOpeningHours
      ? {
          openNow: place.currentOpeningHours.openNow,
          periods: place.currentOpeningHours.periods.map((period) => ({
            open: {
              time: `${period.open?.hour?.toString().padStart(2, '0')}:${period.open?.minute?.toString().padStart(2, '0')}`
            }
          }))
        }
      : undefined
  }))
}

export async function postTextSearchV1(
  requestBody: TextSearchRequestBody
): Promise<PlacesSearchResponse> {
  const validatedRequest = TextSearchRequestBodySchema.parse(requestBody)
  const url = new URL(`${GOOGLE_MAPS_CONFIG.BASE_URL}/places:searchText`)

  const largestSquare = getLargestSquareInCircle(
    validatedRequest.locationBias.circle.center,
    validatedRequest.locationBias.circle.radiusInMeters
  )

  const locationRestriction = {
    rectangle: {
      low: {
        latitude: largestSquare.southWest.latitude,
        longitude: largestSquare.southWest.longitude
      },
      high: {
        latitude: largestSquare.northEast.latitude,
        longitude: largestSquare.northEast.longitude
      }
    }
  }

  const formattedRequest = {
    textQuery: validatedRequest.textQuery,
    locationRestriction,
    maxResultCount: validatedRequest.pageSize
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_CONFIG.API_KEY,
        'X-Goog-FieldMask': '*'
      },
      body: JSON.stringify(formattedRequest)
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Google API Error Details:', errorData)
      throw new Error(
        `Google API error: ${response.status} - ${JSON.stringify(errorData)}`
      )
    }

    const data: TextSearchResponse = await response.json()
    console.log('Google Places API request successful', {
      query: requestBody.textQuery,
      resultCount: data.places?.length ?? 0
    })
    return mapToPlacesSearchResult(data)
  } catch (error) {
    console.log('Google Places API request failed', {
      error,
      query: requestBody.textQuery
    })
    throw error
  }
}
