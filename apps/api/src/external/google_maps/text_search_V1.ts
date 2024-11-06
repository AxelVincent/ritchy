import type {
  PlacesApiResponse,
  SearchRequestBody
} from '@ritchy/types/src/places'
import 'dotenv/config'

const API_KEY = String(process.env.GOOGLE_PLACES_API_KEY)

export async function postTextSearchV1(
  requestBody: SearchRequestBody
): Promise<PlacesApiResponse> {
  const url = new URL('https://places.googleapis.com/v1/places:searchText')

  const formattedRequest = {
    textQuery: requestBody.textQuery,
    locationBias: {
      circle: {
        center: {
          latitude: requestBody.locationBias.circle.center.latitude,
          longitude: requestBody.locationBias.circle.center.longitude
        },
        radius: requestBody.locationBias.circle.radius
      }
    },
    maxResultCount: requestBody.pageSize
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
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

    const data: PlacesApiResponse = await response.json()
    console.log('data', data)
    return data
  } catch (error) {
    console.error('Error calling Google Maps Text Search API:', error)
    throw error
  }
}
