import { legacyTextSearch } from '@/services/placesService'
import { Loader } from '@googlemaps/js-api-loader'
import type { SearchResponse } from '@ritchy/types/src/places.ts'
import { useCallback, useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    googleMapsLoader?: Loader
  }
}

const getLoader = (): Loader => {
  if (!window.googleMapsLoader) {
    window.googleMapsLoader = new Loader({
      apiKey: String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY),
      version: 'beta',
      libraries: ['places', 'marker', 'geometry']
    })
  }
  return window.googleMapsLoader
}

export function useGoogleMap(center: google.maps.LatLngLiteral, zoom = 13) {
  const mapRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const [places, setPlaces] = useState<SearchResponse>([])
  const [loading, setLoading] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null)
  const [markers, setMarkers] = useState<
    google.maps.marker.AdvancedMarkerElement[]
  >([])
  const [infoWindows, setInfoWindows] = useState<
    Map<string, google.maps.InfoWindow>
  >(new Map())
  const [boundsChanged, setBoundsChanged] = useState(false)
  const [userLocation, setUserLocation] =
    useState<google.maps.LatLngLiteral | null>(null)
  const [geolocationRequested, setGeolocationRequested] = useState(false)

  const createMarker = useCallback(
    (place: SearchResponse[number]) => {
      if (!mapInstance.current) return null

      const markerView = new google.maps.marker.PinElement({
        background: '#4285F4',
        borderColor: '#2C5EA6',
        glyphColor: '#FFFFFF',
        scale: 1.2
      })

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapInstance.current,
        position: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        },
        title: place.name,
        content: markerView.element
      })

      const infowindow = new google.maps.InfoWindow({
        content: `
          <div>
            <h3>${place.name}</h3>
            <p>${place.formatted_address}</p>
          </div>
        `
      })

      setInfoWindows((prev) => new Map(prev).set(place.place_id, infowindow))
      marker.addListener('click', () => {
        for (const window of infoWindows.values()) {
          window.close()
        }
        infowindow.open(mapInstance.current, marker)
      })

      return marker
    },
    [infoWindows]
  )

  const initMap = useCallback(() => {
    if (!mapRef.current) return

    mapInstance.current = new google.maps.Map(mapRef.current, {
      center: userLocation || center,
      zoom,
      mapId: 'dbf90bd3672bd87b',
      streetViewControl: false,
      mapTypeControl: false
    })

    setMapLoaded(true)

    mapInstance.current.addListener('bounds_changed', () => {
      setBoundsChanged(true)
    })

    if (searchInputRef.current) {
      const searchBox = new google.maps.places.SearchBox(searchInputRef.current)

      mapInstance.current.addListener('bounds_changed', () => {
        searchBox.setBounds(
          mapInstance.current?.getBounds() as google.maps.LatLngBounds
        )
      })

      searchBox.addListener('places_changed', () => {
        const places = searchBox.getPlaces()
        if (places?.length) {
          const bounds = new google.maps.LatLngBounds()
          for (const place of places) {
            if (place.geometry?.location) {
              bounds.extend(place.geometry.location)
            }
          }
          mapInstance.current?.fitBounds(bounds)
        }
      })
    }
  }, [center, zoom, userLocation])

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (loading || !mapInstance.current) return

      setLoading(true)

      const bounds = mapInstance.current.getBounds()
      const ne = bounds?.getNorthEast()
      const sw = bounds?.getSouthWest()
      const center = mapInstance.current.getCenter()
      let radius = 0

      if (ne && sw && google.maps.geometry && google.maps.geometry.spherical) {
        radius =
          google.maps.geometry.spherical.computeDistanceBetween(ne, sw) / 2
      }

      if (!bounds) {
        setLoading(false)
        return
      }

      try {
        const legacyPlaceResults = await legacyTextSearch({
          query: searchQuery,
          center: { lat: center?.lat() ?? 0, lng: center?.lng() ?? 0 },
          radius
        })

        setPlaces(legacyPlaceResults)
        // Clear existing markers
        for (const marker of markers) {
          marker.map = null
        }

        // Create markers for each place
        const newMarkers = legacyPlaceResults
          .map((place) => createMarker(place))
          .filter(Boolean) as google.maps.marker.AdvancedMarkerElement[]
        setMarkers(newMarkers)
      } catch (error) {
        console.error('Error searching for places:', error)
      } finally {
        setLoading(false)
        setBoundsChanged(false)
      }
    },
    [loading, createMarker, markers]
  )

  const requestGeolocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setUserLocation(userPos)
          initMap()
        },
        () => {
          console.log('Error: The Geolocation service failed.')
          initMap()
        }
      )
    } else {
      console.log("Error: Your browser doesn't support geolocation.")
      initMap()
    }
    setGeolocationRequested(true)
  }, [initMap])

  const handleResearch = useCallback(() => {
    if (searchInputRef.current) {
      performSearch(searchInputRef.current.value)
    }
  }, [performSearch])

  const updateMarkerVisibility = useCallback(() => {
    if (!mapInstance.current) return

    for (const marker of markers) {
      marker.map = mapInstance.current
    }
  }, [markers])

  const handlePlaceClick = useCallback(
    (place: SearchResponse[number]) => {
      setSelectedPlace(place.place_id)
      // Close all open infowindows
      for (const window of infoWindows.values()) {
        window.close()
      }

      // Find the marker for the selected place
      const marker = markers.find((m) => m.title === place.name)
      if (marker && infoWindows.has(place.place_id)) {
        const infoWindow = infoWindows.get(place.place_id)
        infoWindow?.open(mapInstance.current, marker)
      }
    },
    [markers, infoWindows]
  )

  useEffect(() => {
    updateMarkerVisibility()
  }, [updateMarkerVisibility])

  // Initialize Google Maps
  useEffect(() => {
    console.log('Loading Google Maps API...')
    const loader = getLoader()

    loader
      .load()
      .then(() => {
        console.log('Google Maps API loaded')
        if (!geolocationRequested) {
          requestGeolocation()
        } else {
          initMap()
        }
      })
      .catch((e) => {
        console.error('Error loading Google Maps API:', e)
      })
  }, [initMap, requestGeolocation, geolocationRequested])

  const MapContainer = () => (
    <div className="md:col-span-2 border rounded-lg shadow-sm overflow-hidden h-full">
      <div className="p-4 bg-white">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search for a location"
          className="w-full p-2 border rounded"
          onKeyPress={(e) => {
            if (e.key === 'Enter' && searchInputRef.current?.value) {
              performSearch(searchInputRef.current.value)
            }
          }}
        />
        {!geolocationRequested && (
          <button
            onClick={requestGeolocation}
            className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            type="button"
          >
            Use My Location
          </button>
        )}
      </div>
      <div className="relative flex-grow h-[calc(100%-4rem)]">
        <div ref={mapRef} className="w-full h-full" />
        {mapLoaded && boundsChanged && markers.length > 0 && (
          <button
            onClick={handleResearch}
            className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded shadow hover:bg-gray-100 transition-colors"
            type="button"
          >
            Refresh Search
          </button>
        )}
      </div>
    </div>
  )

  return {
    MapContainer,
    places,
    loading,
    selectedPlace,
    handlePlaceClick
  }
}
