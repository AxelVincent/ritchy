import {
  type MapboxGeocodeResponse,
  MapboxGeocodeResponseSchema,
} from '@ritchy/types'
import { debounce } from '../debounce'

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

export const searchLocations = async (
  query: string,
): Promise<MapboxGeocodeResponse> => {
  if (!query)
    return { features: [], attribution: '', type: 'FeatureCollection' }

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
  )
  url.searchParams.append('autocomplete', 'true')
  url.searchParams.append('limit', '5')
  url.searchParams.append('access_token', MAPBOX_ACCESS_TOKEN)

  try {
    const response = await fetch(url.toString())
    const rawData = await response.json()

    // Parse and validate the response
    const data = MapboxGeocodeResponseSchema.parse(rawData)

    return data
  } catch (error) {
    console.error('Error fetching locations:', error)
    return { features: [], attribution: '', type: 'FeatureCollection' }
  }
}

export const debouncedSearchLocations = debounce(searchLocations, 300) as (
  query: string,
) => Promise<MapboxGeocodeResponse>
