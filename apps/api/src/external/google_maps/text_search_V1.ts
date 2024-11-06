import type {
  PlacesApiResponse,
  SearchRequestBody,
  SearchResponse
} from '@ritchy/types/src/places'
import 'dotenv/config'

const API_KEY = String(process.env.GOOGLE_PLACES_API_KEY)

export async function postTextSearchV1(
  requestBody: SearchRequestBody
): Promise<SearchResponse> {
  const url = new URL('https://places.googleapis.com/v1/places:searchText')

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: PlacesApiResponse = await response.json()
    return data.results
  } catch (error) {
    console.error('Error calling Google Maps Text Search API:', error)
    throw error
  }
}
