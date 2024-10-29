import type { SearchResponse } from '@ritchy/types/src/places.ts'

// Remove hardcoded API key and use environment variable
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

// Add this new interface for the legacy search parameters
interface LegacySearchParams {
	query: string
	center: { lat: number; lng: number }
	radius: number
	nextPageToken?: string
}

export async function textSearch(
	query: string,
	bounds: google.maps.LatLngBounds,
	nextPageToken?: string
	// Add other optional parameters like languageCode, includedType, etc.
): Promise<unknown> {
	const locationBias = {
		rectangle: {
			high: {
				latitude: bounds.getNorthEast()?.lat(),
				longitude: bounds.getNorthEast()?.lng()
			},
			low: {
				latitude: bounds.getSouthWest()?.lat(),
				longitude: bounds.getSouthWest()?.lng()
			}
		}
	}

	try {
		const response = await fetch(
			'https://places.googleapis.com/v1/places:searchText',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Goog-Api-Key': API_KEY,
					'X-Goog-FieldMask': 'places,nextPageToken'
				},
				body: JSON.stringify({
					textQuery: query,
					pagetoken: nextPageToken,
					locationBias
				})
			}
		)
		console.log(
			JSON.stringify({
				textQuery: query,
				pagetoken: nextPageToken,
				locationBias
			})
		)

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}
		const data = await response.json()
		return data
	} catch (error) {
		console.error('Error calling Text Search API:', error)
		throw error // Re-throw the error for the caller to handle
	}
}

// async function textSearchUpTo100(
//   query: string,
//   bounds: google.maps.LatLngBounds
// ): Promise<PlacesResponse['places']> {
//   let allPlaces: PlacesResponse['places'] = []
//   let nextPageToken: string | undefined

//   do {
//     const response = await textSearch(query, bounds, nextPageToken)

//     allPlaces = allPlaces.concat(response.places)
//     nextPageToken = response.nextPageToken
//   } while (nextPageToken && allPlaces.length < 100) // Limit to 100

//   return allPlaces
// }

// Updated function for the legacy text search
export const legacyTextSearch = async (
	params: LegacySearchParams
): Promise<SearchResponse> => {
	const response = await fetch('http://localhost:3030/api/places/search', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(params)
	})

	if (!response.ok) {
		throw new Error(
			`Failed to fetch places: ${response.status} ${response.statusText}`
		)
	}

	return response.json()
}
