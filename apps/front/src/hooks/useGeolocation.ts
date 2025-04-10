import type { Location } from '@/components/mapbox/search-map'
import { useEffect, useRef, useState } from 'react'

interface GeolocationState {
  location: Location
  error: string | null
  loading: boolean
}

// Add a helper function to calculate bounds from center
const calculateBounds = (center: Location['center'], radiusKm = 1) => {
  // Earth's radius in kilometers
  const R = 6371

  // Convert radius from km to radians
  const radiusRad = radiusKm / R

  // Convert lat/lng to radians
  const lat = (center.latitude * Math.PI) / 180
  const lng = (center.longitude * Math.PI) / 180

  // Calculate lat bounds
  const latMin = lat - radiusRad
  const latMax = lat + radiusRad

  // Calculate lng bounds
  // Need to consider smaller radius at higher latitudes
  const lngDelta = Math.asin(Math.sin(radiusRad) / Math.cos(lat))
  const lngMin = lng - lngDelta
  const lngMax = lng + lngDelta

  // Convert back to degrees
  return {
    northEast: {
      latitude: (latMax * 180) / Math.PI,
      longitude: (lngMax * 180) / Math.PI,
    },
    southWest: {
      latitude: (latMin * 180) / Math.PI,
      longitude: (lngMin * 180) / Math.PI,
    },
  }
}

export const useGeolocation = (
  defaultLocation: Location,
  skipGeolocation: boolean,
  runOnce = false,
) => {
  const [state, setState] = useState<GeolocationState>({
    location: defaultLocation,
    error: null,
    loading: true,
  })
  const hasRun = useRef(false)

  useEffect(() => {
    if (
      !('geolocation' in navigator) ||
      skipGeolocation ||
      (runOnce && hasRun.current)
    ) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported',
        loading: false,
      }))
      return
    }

    hasRun.current = true

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const center = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }

        setState({
          location: {
            center,
            bounds: calculateBounds(center),
          },
          error: null,
          loading: false,
        })
      },
      (error) => {
        let errorMessage: string
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'User denied location access'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out'
            break
          default:
            errorMessage = 'An unknown error occurred'
        }
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }))
      },
      options,
    )
  }, [skipGeolocation, runOnce])

  return state
}
