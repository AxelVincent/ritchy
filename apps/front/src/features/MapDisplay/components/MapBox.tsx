import mapboxgl from 'mapbox-gl'
import { type FC, useEffect, useMemo, useRef, useState } from 'react'
import { useMapCircle } from '../hooks/useMapCircle'
import { useMapInitialization } from '../hooks/useMapInitialization'
import { MAP_SETTINGS, RADIUS_SETTINGS } from '../types'
import { RadiusSlider } from './RadiusSlider'

export const MapBox: FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const initialCenter = useMemo(
    () => [-79.4512, 43.6568] as [number, number],
    []
  )
  const [sliderValue, setSliderValue] = useState(RADIUS_SETTINGS.initial)
  const [radius, setRadius] = useState(RADIUS_SETTINGS.initial)

  const mapRef = useMapInitialization(
    mapContainerRef,
    initialCenter,
    MAP_SETTINGS
  )
  const { updateCircleData } = useMapCircle(mapRef)

  useEffect(() => {
    if (!mapRef.current) return

    mapRef.current.on('load', () => {
      mapRef.current?.addSource('circle', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { radius_m: sliderValue },
          geometry: {
            type: 'Point',
            coordinates: [
              mapRef.current.getCenter().lng,
              mapRef.current.getCenter().lat
            ]
          }
        }
      })

      // Add the layer with the circle
      mapRef.current?.addLayer({
        id: 'center-circle',
        type: 'circle',
        source: 'circle',
        paint: {
          'circle-radius': [
            'interpolate',
            ['exponential', 2],
            ['zoom'],
            0,
            ['/', ['*', ['number', ['get', 'radius_m']], 1], 111319.9],
            22,
            [
              '*',
              ['/', ['*', ['number', ['get', 'radius_m']], 1], 111319.9],
              4194304
            ]
          ],
          'circle-color': '#007cbf',
          'circle-opacity': 0.3
        }
      })
    })

    const marker = new mapboxgl.Marker()
      .setLngLat(mapRef.current.getCenter())
      .addTo(mapRef.current)

    mapRef.current.on('move', () => {
      if (mapRef.current) {
        const center = mapRef.current.getCenter()
        marker.setLngLat(center)
        updateCircleData(center, sliderValue)
      }
    })
  }, [sliderValue, mapRef, updateCircleData])

  const handleChange = (newValue: number) => {
    setSliderValue(newValue)
    setRadius(newValue)

    if (mapRef.current) {
      updateCircleData(mapRef.current.getCenter(), sliderValue)
    }
  }

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <div ref={mapContainerRef} className="h-full w-full" />
      <RadiusSlider
        value={radius}
        onChange={handleChange}
        settings={RADIUS_SETTINGS}
      />
    </div>
  )
}
