import type {
	PlacesApiResponse,
	SearchResponse
} from '@ritchy/types/src/places'
import 'dotenv/config'

const API_KEY = String(process.env.GOOGLE_PLACES_API_KEY)

// export async function textSearch(
//   query: string,
//   bounds: google.maps.LatLngBounds,
//   nextPageToken?: string
//   // Add other optional parameters like languageCode, includedType, etc.
// ): Promise<PlacesResponse> {
//   const locationBias = {
//     rectangle: {
//       high: {
//         latitude: bounds.getNorthEast()?.lat(),
//         longitude: bounds.getNorthEast()?.lng()
//       },
//       low: {
//         latitude: bounds.getSouthWest()?.lat(),
//         longitude: bounds.getSouthWest()?.lng()
//       }
//     }
//   }

//   try {
//     const response = await fetch(
//       'https://places.googleapis.com/v1/places:searchText',
//       {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'X-Goog-Api-Key': API_KEY,
//           'X-Goog-FieldMask': 'places,nextPageToken'
//         },
//         body: JSON.stringify({
//           textQuery: query,
//           pagetoken: nextPageToken,
//           locationBias
//         })
//       }
//     )
//     console.log(
//       JSON.stringify({
//         textQuery: query,
//         pagetoken: nextPageToken,
//         locationBias
//       })
//     )

//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`)
//     }
//     const data = await response.json()
//     console.log(data.nextPageToken)
//     return data
//   } catch (error) {
//     console.error('Error calling Text Search API:', error)
//     throw error // Re-throw the error for the caller to handle
//   }
// }

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

export async function legacyTextSearch(
	query: string,
	bias: { center: { lat: number; lng: number }; radius: number },
	nextPageToken?: string
): Promise<SearchResponse> {
	const location = `${bias.center.lat},${bias.center.lng}`
	const url = new URL(
		'https://maps.googleapis.com/maps/api/place/textsearch/json'
	)
	url.searchParams.append('query', query)
	url.searchParams.append('location', location)
	url.searchParams.append('radius', bias.radius.toString())
	url.searchParams.append('key', API_KEY)
	if (nextPageToken) {
		url.searchParams.append('pagetoken', nextPageToken)
	}

	try {
		const response = await fetch(url.toString(), {
			headers: {
				'X-Goog-Api-Key': API_KEY
			},
			method: 'GET'
		})

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		const data: PlacesApiResponse = await response.json()
		return data.results
	} catch (error) {
		console.error('Error calling Legacy Text Search API:', error)
		throw error
	}
}
