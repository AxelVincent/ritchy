import { destination, point } from '@turf/turf'
import type { LngLat } from 'mapbox-gl'

import { useCallback } from 'react'

export const useMapSquare = (mapRef: React.RefObject<mapboxgl.Map>) => {
  // Calculate square coordinates without updating the map
  const calculateSquareCoordinates = useCallback(
    (center: LngLat, radiusInMeters: number) => {
      // TODO - Create a GeoJSON shared package
      // Convert radius from meters to approximate degrees
      const centerPoint = point([center.lng, center.lat])
      const coordinates = [
        destination(centerPoint, radiusInMeters, 45, { units: 'meters' })
          .geometry.coordinates, // NW
        destination(centerPoint, radiusInMeters, 135, { units: 'meters' })
          .geometry.coordinates, // NE
        destination(centerPoint, radiusInMeters, 225, { units: 'meters' })
          .geometry.coordinates, // SE
        destination(centerPoint, radiusInMeters, 315, { units: 'meters' })
          .geometry.coordinates, // SW
        destination(centerPoint, radiusInMeters, 45, { units: 'meters' })
          .geometry.coordinates, // Back to NW to close the polygon
      ]
      return coordinates
    },
    [],
  )

  // Update square on the map
  const updateSquareData = useCallback(
    (center: LngLat, radiusInMeters: number) => {
      if (!mapRef.current) return

      const coordinates = calculateSquareCoordinates(center, radiusInMeters)
      const source = mapRef.current.getSource('square')

      if (source && 'setData' in source) {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates],
          },
        })
      }
    },
    [calculateSquareCoordinates, mapRef],
  )

  return {
    calculateSquareCoordinates,
    updateSquareData,
  }
}
