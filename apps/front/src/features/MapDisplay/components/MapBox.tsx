import type { Place, TextSearchResponse } from '@ritchy/types/src/places.js'
import mapboxgl from 'mapbox-gl'
import { type FC, useEffect, useMemo, useRef, useState } from 'react'
import { useMapCircle } from '../hooks/useMapCircle'
import { useMapInitialization } from '../hooks/useMapInitialization'
import { MAP_SETTINGS, RADIUS_SETTINGS } from '../types'
import { RadiusSlider } from './RadiusSlider'

interface MapBoxProps {
  onLocationChange: (location: {
    latitude: number
    longitude: number
    radius: number
  }) => void
  initialRadius?: number
  searchResults: TextSearchResponse | null
}

export const MapBox: FC<MapBoxProps> = ({
  onLocationChange,
  initialRadius = RADIUS_SETTINGS.initial,
  searchResults
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const initialCenter = useMemo(
    () => [-79.4512, 43.6568] as [number, number],
    []
  )
  const [radius, setRadius] = useState(initialRadius)
  const markersRef = useRef<mapboxgl.Marker[]>([])

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
          properties: { radius_m: radius },
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
        updateCircleData(center, radius)
        onLocationChange({
          latitude: center.lat,
          longitude: center.lng,
          radius
        })
      }
    })
  }, [radius, mapRef, updateCircleData, onLocationChange])

  useEffect(() => {
    console.log('🔄 Markers useEffect triggered', {
      hasMap: !!mapRef.current,
      resultsCount: searchResults?.places?.length ?? 0,
      existingMarkers: markersRef.current.length
    })

    // Clear existing result markers
    console.log('🗑️ Clearing existing markers:', markersRef.current.length)
    for (const marker of markersRef.current) {
      marker.remove()
    }
    markersRef.current = []

    if (!mapRef.current || !searchResults?.places) {
      console.log('⚠️ Exiting early - missing map or search results', {
        map: !mapRef.current,
        results: searchResults?.places
      })
      return
    }

    // Create new markers for each result
    console.log(
      '📍 Creating new markers for',
      searchResults.places.length,
      'places'
    )
    for (const place of searchResults.places) {
      if (place.location) {
        const marker = new mapboxgl.Marker({
          color: place.currentOpeningHours?.openNow ? '#22c55e' : '#ef4444', // Green if open, red if closed
          scale: 0.8 // Slightly smaller markers
        })
          .setLngLat([place.location.longitude, place.location.latitude])
          .setPopup(
            new mapboxgl.Popup({
              offset: 25,
              maxWidth: '300px',
              className: 'place-popup'
            }).setHTML(createPopupContent(place))
          )
          .addTo(mapRef.current)

        markersRef.current.push(marker)
      }
    }
    console.log('✅ Finished creating markers:', markersRef.current.length)
  }, [searchResults, mapRef])

  const handleChange = (newValue: number) => {
    setRadius(newValue)

    if (mapRef.current) {
      const center = mapRef.current.getCenter()
      updateCircleData(center, newValue)
      onLocationChange({
        latitude: center.lat,
        longitude: center.lng,
        radius: newValue
      })
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

const createPopupContent = (place: Place) => {
  return `
    <div class="p-3 max-w-sm">
      <h3 class="font-bold text-lg mb-2">${place.displayName.text}</h3>
      ${
        place.rating
          ? `
        <div class="mb-2">
          ⭐ ${place.rating.toFixed(1)} ${place.userRatingCount ? `(${place.userRatingCount} reviews)` : ''}
        </div>
      `
          : ''
      }
      <p class="text-sm mb-2">${place.shortFormattedAddress}</p>
      ${
        place.currentOpeningHours
          ? `
        <div class="text-sm ${place.currentOpeningHours.openNow ? 'text-green-600' : 'text-red-600'}">
          ${place.currentOpeningHours.openNow ? 'Open now' : 'Closed'}
        </div>
      `
          : ''
      }
      <div class="mt-2">
        <a href="${place.googleMapsUri}" target="_blank" class="text-blue-500 text-sm hover:underline">
          View on Google Maps
        </a>
      </div>
    </div>
  `
}
