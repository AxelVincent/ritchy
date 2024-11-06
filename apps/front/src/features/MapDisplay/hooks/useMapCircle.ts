import { useCallback } from 'react'
import type { MapCircleData } from '../types'

export const useMapCircle = (mapRef: React.RefObject<mapboxgl.Map>) => {
  const updateCircleData = useCallback(
    (center: mapboxgl.LngLat, radius: number) => {
      const circleSource = mapRef.current?.getSource(
        'circle'
      ) as mapboxgl.GeoJSONSource
      if (!circleSource) return

      const newData: MapCircleData = {
        type: 'Feature',
        properties: { radius_m: radius },
        geometry: {
          type: 'Point',
          coordinates: [center.lng, center.lat]
        }
      }

      circleSource.setData(newData)
    },
    [mapRef]
  )

  return { updateCircleData }
}
