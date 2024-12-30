import type { Location } from '@/features/MapDisplay/types'

export const DEFAULT_LOCATION: Location = {
  latitude: 48.8566,
  longitude: 2.3522,
  radiusInMeters: 5000,
}

export const VIEW_SIZES = {
  map: { mapSize: 'basis-2/3', dataSize: 'basis-1/3' },
  data: { mapSize: 'basis-1/3', dataSize: 'basis-2/3' },
  equal: { mapSize: 'basis-1/2', dataSize: 'basis-1/2' },
} as const
