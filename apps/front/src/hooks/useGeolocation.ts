import type { Location } from '@/features/MapDisplay/types'
import { useEffect, useRef, useState } from 'react'

interface GeolocationState {
  location: Location
  error: string | null
  loading: boolean
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
        setState({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            radiusInMeters: defaultLocation?.radiusInMeters || 3000,
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
  }, [defaultLocation?.radiusInMeters, skipGeolocation, runOnce])

  return state
}
