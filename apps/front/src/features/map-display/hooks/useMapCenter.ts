import type { Map as MapboxMap } from 'mapbox-gl'
import mapboxgl from 'mapbox-gl'
import { type RefObject, useEffect } from 'react'
import type { LocationChangeEvent } from '../types/map'

export const useMapCenter = (
  mapRef: RefObject<MapboxMap>,
  radiusInMeters: number,
  onLocationChange: (location: LocationChangeEvent) => void,
  updateSquareData: (center: mapboxgl.LngLat, radius: number) => void,
) => {
  useEffect(() => {
    if (!mapRef.current) return

    const map = mapRef.current
    const marker = new mapboxgl.Marker().setLngLat(map.getCenter()).addTo(map)

    const handleMapMove = () => {
      const center = map.getCenter()
      marker.setLngLat(center)
      updateSquareData(center, radiusInMeters)
      onLocationChange({
        latitude: center.lat,
        longitude: center.lng,
        radiusInMeters,
      })
    }

    map.on('move', handleMapMove)

    return () => {
      map.off('move', handleMapMove)
      marker.remove()
    }
  }, [mapRef, radiusInMeters, onLocationChange, updateSquareData])
}
