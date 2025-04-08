import type { Location } from '@/components/mapbox/search-map'

export const DEFAULT_LOCATION: Location = {
  center: {
    latitude: 48.8566,
    longitude: 2.3522,
  },
  bounds: {
    northEast: { latitude: 48.8566, longitude: 2.3522 },
    southWest: { latitude: 48.8566, longitude: 2.3522 },
  },
}
