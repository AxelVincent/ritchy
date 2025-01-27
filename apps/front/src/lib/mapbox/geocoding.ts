import { MapboxGeocodeResponseSchema } from '@ritchy/types'
import { debounce } from '../debounce'

export interface GeocodingResult {
  options: {
    name: string
    coordinates: [number, number]
    place_formatted: string
  }[]
  value: string | null
}

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

export const searchLocations = async (
  query: string,
): Promise<GeocodingResult> => {
  if (!query) return { options: [], value: null }
  console.log('query: ', query)

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
  )
  url.searchParams.append('autocomplete', 'true')
  url.searchParams.append('limit', '5')
  url.searchParams.append('access_token', MAPBOX_ACCESS_TOKEN)

  try {
    const response = await fetch(url.toString())
    const rawData = await response.json()
    console.log('rawData: ', rawData)

    // Parse and validate the response
    const data = MapboxGeocodeResponseSchema.parse(rawData)

    return {
      options: data.features.map((feature) => ({
        name: feature.text,
        coordinates: feature.geometry.coordinates,
        place_formatted: feature.place_name,
      })),
      value: data.type,
    }
  } catch (error) {
    console.error('Error fetching locations:', error)
    return { options: [], value: null }
  }
}

export const debouncedSearchLocations = debounce(searchLocations, 300) as (
  query: string,
) => Promise<GeocodingResult>
