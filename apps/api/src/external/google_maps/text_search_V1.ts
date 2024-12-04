import 'dotenv/config'
import { GOOGLE_MAPS_CONFIG } from '../../config/google_maps'
import { getLargestSquareFromCoordinates } from '../../utils/geo_utils'

import type { PlacesSearchResponse } from '@ritchy/types'
import {
  type GooglePlacesTextSearchRequest,
  type GooglePlacesTextSearchResponse,
  type TextSearchRequestBody,
  TextSearchRequestBodySchema,
} from './types'

function mapToPlacesSearchResult(
  response: GooglePlacesTextSearchResponse,
): PlacesSearchResponse {
  if (!response.places) return []

  return response.places.map((place) => ({
    id: place.id,
    websiteUri: place.websiteUri || '',
    displayName: place.displayName?.text || '',
    location: {
      latitude: place.location?.latitude || 0,
      longitude: place.location?.longitude || 0,
    },
    types: place.types || [],
    formattedAddress: place.formattedAddress || '',
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    shortFormattedAddress: place.shortFormattedAddress,
    googleMapsUri: place.googleMapsUri || '',
    internationalPhoneNumber: place.internationalPhoneNumber,
    currentOpeningHours: place.currentOpeningHours
      ? {
          openNow: place.currentOpeningHours.openNow,
          periods: place.currentOpeningHours.periods.map((period) => ({
            open: {
              time: `${period.open?.hour?.toString().padStart(2, '0')}:${period.open?.minute?.toString().padStart(2, '0')}`,
            },
          })),
        }
      : undefined,
  }))
}

async function fetchSinglePage(
  formattedRequest: GooglePlacesTextSearchRequest,
): Promise<GooglePlacesTextSearchResponse> {
  const url = new URL(`${GOOGLE_MAPS_CONFIG.BASE_URL}/places:searchText`)

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_CONFIG.API_KEY,
      'X-Goog-FieldMask': '*',
    },
    body: JSON.stringify(formattedRequest),
  })

  if (!response.ok) {
    const errorData = await response.json()
    console.error('Google API Error Details:', errorData)
    throw new Error(
      `Google API error: ${response.status} - ${JSON.stringify(errorData)}`,
    )
  }

  return response.json()
}

export async function postTextSearchV1(
  requestBody: TextSearchRequestBody,
): Promise<PlacesSearchResponse> {
  const validatedRequest = TextSearchRequestBodySchema.parse(requestBody)

  const largestSquare = getLargestSquareFromCoordinates(
    validatedRequest.locationBias.circle.center,
    validatedRequest.locationBias.circle.radiusInMeters,
  )

  const locationRestriction = {
    rectangle: {
      low: {
        latitude: largestSquare.southWest.latitude,
        longitude: largestSquare.southWest.longitude,
      },
      high: {
        latitude: largestSquare.northEast.latitude,
        longitude: largestSquare.northEast.longitude,
      },
    },
  }

  try {
    const allResults: GooglePlacesTextSearchResponse['places'] = []
    let nextPageToken: string | undefined

    do {
      const formattedRequest = {
        textQuery: validatedRequest.textQuery,
        locationRestriction,
        maxResultCount: 20, // Google's max page size
        pageToken: nextPageToken, // Use the nextPageToken from the previous response
      }

      const data = await fetchSinglePage(formattedRequest)

      if (data.places) {
        allResults.push(...data.places)
      }

      nextPageToken = data.nextPageToken // Update nextPageToken with the new token

      // Add delay between requests as required by Google
      if (nextPageToken) {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      // Stop if we have enough results or no more pages
    } while (nextPageToken && allResults.length < validatedRequest.pageSize)

    // Trim results to match requested pageSize
    const trimmedResults = allResults.slice(0, validatedRequest.pageSize)

    console.log('Google Places API request successful', {
      query: requestBody.textQuery,
      resultCount: trimmedResults.length,
      pagesRequested: Math.ceil(trimmedResults.length / 20),
    })

    return mapToPlacesSearchResult({ places: trimmedResults })
  } catch (error) {
    console.log('Google Places API request failed', {
      error,
      query: requestBody.textQuery,
    })
    throw error
  }
}
