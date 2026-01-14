import { logger } from '@ritchy/logger'

export type ParsedGoogleMapsUrl = {
  placeId?: string // If directly in URL (place_id param)
  placeName?: string // Extracted from URL path
  coordinates?: {
    latitude: number
    longitude: number
  }
  cid?: string // Customer ID (legacy format)
  isShortUrl?: boolean
}

/**
 * Parse various Google Maps URL formats to extract place information
 *
 * Supported formats:
 * 1. Place ID in URL: /maps/place/?place_id=ChIJ...
 * 2. Place name in path: /maps/place/Store+Name/@lat,lng
 * 3. Search URL: /maps/search/query/@lat,lng
 * 4. Embed format with CID: maps.google.com/maps?cid=XXXX
 *
 * NOT supported (v1):
 * - Short URLs: goo.gl/maps/XXXX (requires redirect follow)
 */
export const parseGoogleMapsUrl = (url: string): ParsedGoogleMapsUrl => {
  const result: ParsedGoogleMapsUrl = {}

  try {
    const parsed = new URL(url)

    // Check for short URLs (not supported in v1)
    if (parsed.hostname === 'goo.gl' || parsed.hostname === 'maps.app.goo.gl') {
      result.isShortUrl = true
      return result
    }

    const params = parsed.searchParams

    // Check for direct place_id parameter
    const placeIdParam = params.get('place_id')
    if (placeIdParam?.startsWith('ChIJ')) {
      result.placeId = placeIdParam
      return result
    }

    // Check for CID (Customer ID) - legacy format
    const cidParam = params.get('cid')
    if (cidParam) {
      result.cid = cidParam
    }

    // Extract place name from path
    // Format: /maps/place/Place+Name+Here/@lat,lng,zoom
    const placeMatch = parsed.pathname.match(/\/place\/([^/@]+)/)
    if (placeMatch) {
      result.placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
    }

    // Extract coordinates from URL
    // Format: @43.5425907,1.5434052,17z
    const coordMatch = parsed.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (coordMatch) {
      result.coordinates = {
        latitude: Number.parseFloat(coordMatch[1]),
        longitude: Number.parseFloat(coordMatch[2]),
      }
    }

    // Alternative coordinate format in hash/search params
    // Format: !3d43.5425907!4d1.5434052
    const dataMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
    if (dataMatch && !result.coordinates) {
      result.coordinates = {
        latitude: Number.parseFloat(dataMatch[1]),
        longitude: Number.parseFloat(dataMatch[2]),
      }
    }

    return result
  } catch (error) {
    logger.warn({
      msg: 'Failed to parse Google Maps URL',
      event: 'google_maps_url_parse_error',
      metadata: { url, error },
    })
    return result
  }
}
