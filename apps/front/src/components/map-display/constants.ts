import type { Location } from '@/components/mapbox/search-map'

export const DEFAULT_LOCATION: Location = {
  center: {
    latitude: 48.8566,
    longitude: 2.3522,
  },
  bounds: {
    northEast: { latitude: 48.9021, longitude: 2.4699 }, // NE corner of Paris
    southWest: { latitude: 48.8155, longitude: 2.2241 }, // SW corner of Paris
  },
}
