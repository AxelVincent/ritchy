import { logger } from '@ritchy/logger'

interface SearchResponse {
  search_metadata: SearchMetadata
  search_parameters: SearchParameters
  search_information: SearchInformation
  local_results: LocalResult[]
}

interface SearchMetadata {
  id: string
  status: string
  created_at: string
  request_time_taken: number
  parsing_time_taken: number
  total_time_taken: number
  request_url: string
  html_url: string
  json_url: string
}

interface SearchParameters {
  engine: string
  q: string
  ll: string
  google_domain: string
  hl: string
}

interface SearchInformation {
  query_displayed: string
  state: string
}

interface LocalResult {
  position: number
  ludocid: string
  place_id: string
  kgmid: string
  data_id: string
  title: string
  description: string
  address: string
  phone: string
  price: string
  price_description: string
  rating: number
  reviews: number
  reviews_link: string
  website: string
  domain: string
  gps_coordinates: {
    latitude: number
    longitude: number
  }
  type: string
  types: string[]
  open_state: string
  hours: string
  open_hours: {
    [day: string]: string
  }
  extensions: Extension[]
  images: string[]
  thumbnail: string
}

interface Extension {
  title: string
  items: ExtensionItem[]
}

interface ExtensionItem {
  title: string
  value: string
}

export async function searchGoogleMaps(
  query: string,
  latitude: number,
  longitude: number,
  zoom: string,
): Promise<SearchResponse> {
  const url = 'https://www.searchapi.io/api/v1/search'
  const params = new URLSearchParams({
    engine: 'google_maps',
    q: query,
    ll: `@${latitude},${longitude},${zoom}`,
    api_key: String(process.env.GMAP_SEARCH_API_KEY),
  })

  try {
    const response = await fetch(`${url}?${params}`)
    const data = await response.json()
    return data
  } catch (error) {
    logger.error({
      msg: 'Error',
      event: 'search_google_maps_error',
      metadata: { error },
    })
    throw error
  }
}
