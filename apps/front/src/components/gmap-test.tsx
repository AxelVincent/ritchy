import type React from 'react'
import { PlacesDataTable } from './PlacesDataTable'
import { useGoogleMap } from './useGoogleMap'

interface MapComponentProps {
  center: google.maps.LatLngLiteral
  zoom?: number
}

const MapComponent: React.FC<MapComponentProps> = ({ center, zoom = 13 }) => {
  const { MapContainer, places, loading, selectedPlace, handlePlaceClick } =
    useGoogleMap(center, zoom)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-screen w-screen">
      <MapContainer />
      <div className="md:col-span-1 border rounded-lg p-4 shadow-sm overflow-y-auto h-full">
        {loading ? (
          <div className="text-center text-gray-600">Loading places...</div>
        ) : (
          <PlacesDataTable
            places={places}
            onPlaceClick={handlePlaceClick}
            selectedPlace={selectedPlace}
          />
        )}
      </div>
    </div>
  )
}

export default MapComponent
