import './styles.css'
import { useMapInitialization } from '@/features/map-display/hooks/useMapInitialization'
import { useMapSquare } from '@/features/map-display/hooks/useMapSquare'
import { MAP_SETTINGS } from '@/features/map-display/types'
import type { Location } from '@/features/map-display/types'
import { debounce } from '@/lib/debounce'
import type { Place, PlacesSearchResponse } from '@ritchy/types'
import type { RowSelectionState } from '@tanstack/react-table'
import mapboxgl, { type LngLat } from 'mapbox-gl'
import { type FC, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useMarkerManager } from './hooks/useMarkerManager'
import { PlacePopup } from './place_marker/PlacePopup'

const DEBUG = false

const debugLog = (...args: unknown[]) => {
  if (DEBUG) {
    console.log('[MapBox]', ...args)
  }
}

// Create a dedicated type for the location change event
type LocationChangeEvent = {
  latitude: number
  longitude: number
  radiusInMeters: number
}

// Improve props interface with more specific types
interface MapBoxProps {
  onLocationChange: (location: LocationChangeEvent) => void
  searchResults: PlacesSearchResponse | null
  selectedPlaceId: string | null
  setSelectedPlaceId: (placeId: string | null) => void
  userLocation: Location
  dataTableRowSelection: RowSelectionState
  radiusInMeters: number
  listId?: string
  filteredPlaceIds: Set<string>
}

export const MapBox: FC<MapBoxProps> = ({
  onLocationChange,
  searchResults,
  selectedPlaceId,
  setSelectedPlaceId,
  userLocation,
  // dataTableRowSelection,
  radiusInMeters,
  listId,
  filteredPlaceIds,
}) => {
  debugLog('MapBox render:', { userLocation, radiusInMeters, listId })

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const currentSelectedPlaceIdRef = useRef<string | null>(null)
  const centerMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const isSelectionMovement = useRef(false)
  // const [popupContainers, setPopupContainers] = useState(
  //   new Map<string, HTMLElement>(),
  // )

  const initialCenter = useMemo(() => {
    debugLog('Calculating initial center:', userLocation)
    return [userLocation.longitude, userLocation.latitude] as [number, number]
  }, [userLocation])

  const mapRef = useMapInitialization(
    mapContainerRef,
    initialCenter,
    MAP_SETTINGS,
  )

  const { calculateSquareCoordinates, updateSquareData } = useMapSquare(mapRef)

  // Resize observer effect
  useEffect(() => {
    debugLog('Setting up resize observer')
    if (!mapRef.current || !mapContainerRef.current) {
      debugLog('Resize observer: Missing refs')
      return
    }

    const debouncedResize = debounce(() => {
      debugLog('Resizing map')
      mapRef.current?.resize()
    }, 100)

    const resizeObserver = new ResizeObserver(debouncedResize)
    resizeObserver.observe(mapContainerRef.current)

    return () => {
      debugLog('Cleaning up resize observer')
      if (mapContainerRef.current) {
        resizeObserver.unobserve(mapContainerRef.current)
      }
      resizeObserver.disconnect()
      debouncedResize.cancel()
    }
  }, [mapRef])

  // Map initialization effect
  useEffect(() => {
    debugLog('Map initialization effect running', { listId })
    if (!mapRef.current || listId) {
      debugLog('Map initialization skipped:', {
        hasMap: !!mapRef.current,
        listId,
      })
      return
    }

    mapRef.current.on('load', () => {
      debugLog('Map load event triggered')
      if (!mapRef.current) {
        debugLog('Map ref lost during load event')
        return
      }

      debugLog('Creating center marker')
      centerMarkerRef.current = new mapboxgl.Marker()
        .setLngLat(mapRef.current.getCenter())
        .addTo(mapRef.current)

      debugLog('Adding square source')
      try {
        mapRef.current?.addSource('square', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [
                calculateSquareCoordinates(
                  mapRef.current.getCenter(),
                  radiusInMeters,
                ),
              ],
            },
          },
        })

        debugLog('Adding square fill layer')
        mapRef.current?.addLayer({
          id: 'center-square',
          type: 'fill',
          source: 'square',
          paint: {
            'fill-color': 'blue',
            'fill-opacity': 0.1,
          },
        })

        debugLog('Adding square border layer')
        mapRef.current?.addLayer({
          id: 'center-square-border',
          type: 'line',
          source: 'square',
          paint: {
            'line-color': 'blue',
            'line-width': 1,
          },
        })
      } catch (error) {
        debugLog('Error setting up map layers:', error)
      }
    })
  }, [radiusInMeters, mapRef, calculateSquareCoordinates, listId])

  // Create a memoized debounced handler
  const debouncedLocationChange = useMemo(
    () =>
      debounce((center: LngLat) => {
        onLocationChange({
          latitude: center.lat,
          longitude: center.lng,
          radiusInMeters,
        })
      }, 1000), // Adjust the delay (in ms) as needed
    [onLocationChange, radiusInMeters],
  )

  // Map movement effect
  useEffect(() => {
    debugLog('Setting up map movement handlers', { listId })
    if (!mapRef.current || listId) {
      debugLog('Map movement setup skipped')
      return
    }

    mapRef.current.on('move', () => {
      if (isSelectionMovement.current) return

      if (mapRef.current) {
        const center = mapRef.current.getCenter()
        centerMarkerRef.current?.setLngLat(center)
        updateSquareData(center, radiusInMeters)
        debouncedLocationChange(center)
      }
    })

    return () => {
      debouncedLocationChange.cancel()
    }
  }, [
    radiusInMeters,
    mapRef,
    updateSquareData,
    debouncedLocationChange,
    listId,
  ])

  // Square update effect
  useEffect(() => {
    debugLog('Square update effect', { listId })
    if (!mapRef.current || listId) {
      debugLog('Square update skipped')
      return
    }
    updateSquareData(mapRef.current.getCenter(), radiusInMeters)
  }, [radiusInMeters, mapRef, updateSquareData, listId])

  // Replace the manual marker management with the hook
  const { openPopups, popupContainers, markersRef } = useMarkerManager({
    map: mapRef.current,
    places: searchResults ?? [],
    filteredPlaceIds,
    onMarkerClick: setSelectedPlaceId,
  })

  // Add this memoized map outside of the component or at the top of the component
  const searchResultsMap = useMemo(() => {
    if (!searchResults) return new Map<string, Place>()
    return new Map(searchResults.map((place) => [place.id, place]))
  }, [searchResults])

  // Optimize popup elements creation to only render open popups
  const popupElements = useMemo(
    () =>
      Array.from(popupContainers.entries())
        .filter(([id]) => openPopups.has(id))
        .map(([id, container]) => {
          const place = searchResultsMap.get(id)
          if (!place) return null

          return createPortal(
            <PlacePopup key={`popup-${id}`} place={place} />,
            container,
            `portal-${id}`,
          )
        })
        .filter(Boolean),
    [popupContainers, searchResultsMap, openPopups], // Add openPopups dependency
  )

  // Selection state effect
  useEffect(() => {
    debugLog('Selection state effect', {
      selectedPlaceId,
      currentSelectedPlaceIdRef,
      mapRef,
    })
    if (!mapRef.current || !selectedPlaceId) {
      debugLog('Selection state skipped: no map or no selection')
      return
    }

    isSelectionMovement.current = true

    // Clear previous popup
    if (currentSelectedPlaceIdRef.current) {
      const previousMarkerData = markersRef.current.get(
        currentSelectedPlaceIdRef.current,
      )
      if (previousMarkerData?.marker.getPopup()?.isOpen()) {
        previousMarkerData.marker.togglePopup()
      }
    }

    if (!selectedPlaceId) {
      currentSelectedPlaceIdRef.current = null
      return
    }

    const markerData = markersRef.current.get(selectedPlaceId)
    if (!markerData?.marker.getLngLat()) {
      debugLog('No marker location found for selection')
      return
    }

    const markerLocation = markerData.marker.getLngLat()

    // Calculate the distance between current center and marker
    const currentCenter = mapRef.current.getCenter()
    const distanceInDegrees = Math.sqrt(
      (currentCenter.lng - markerLocation.lng) ** 2 +
        (currentCenter.lat - markerLocation.lat) ** 2,
    )

    // If distance is too large, jump to location instead of animating
    if (distanceInDegrees > 1) {
      // Adjust threshold as needed
      mapRef.current.setCenter(markerLocation)
      mapRef.current.setZoom(12)
    } else {
      // Use flyTo for shorter distances
      mapRef.current.flyTo({
        center: markerLocation,
        zoom: 12,
        speed: 0.8, // Reduce animation speed
        curve: 1, // Linear animation
      })
    }

    if (!markerData.marker.getPopup()?.isOpen()) {
      markerData.marker.togglePopup()
    }
    currentSelectedPlaceIdRef.current = selectedPlaceId

    // Reset flag after movement completes
    const onMoveEnd = () => {
      isSelectionMovement.current = false
      mapRef.current?.off('moveend', onMoveEnd)
    }
    mapRef.current.on('moveend', onMoveEnd)
  }, [selectedPlaceId, mapRef, markersRef])

  return (
    <>
      <div ref={mapContainerRef} className="h-full w-full" />
      {popupElements}
    </>
  )
}
