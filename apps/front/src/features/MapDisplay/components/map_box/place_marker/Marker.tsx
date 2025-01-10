import type { Place } from '@ritchy/types'
import mapboxgl from 'mapbox-gl'

import { PlacePopup } from './PlacePopup'

import { createRoot } from 'react-dom/client'
import { MARKER_SETTINGS } from '../constants/markers'

export const MarkerWithPopup = (
  place: Place,
  color: string,
  setSelectedPlaceId: (placeId: string | null) => void,
) => {
  // Create a DOM node for React to render into
  const popupNode = document.createElement('div')

  const popup = new mapboxgl.Popup({
    offset: MARKER_SETTINGS.popupOffset,
    maxWidth: MARKER_SETTINGS.popupMaxWidth,
  })

  // Use React 18's createRoot API
  const root = createRoot(popupNode)
  root.render(<PlacePopup place={place} />)

  popup.setDOMContent(popupNode)

  const marker = new mapboxgl.Marker({
    color: color,
    scale: 0.8,
  })
    .setLngLat([place.location.longitude, place.location.latitude])
    .setPopup(popup)

  const element = marker.getElement()

  // Add click handler to marker element
  element.addEventListener('click', () => {
    // console.log('🎯 marker clicked', place.id)
    setSelectedPlaceId(place.id)
  })

  // Add click handler for the popup close button
  popup.on('open', () => {
    const closeButton = document.querySelector('.mapboxgl-popup-close-button')
    closeButton?.addEventListener('click', () => {
      // console.log('🎯 popup close button clicked', place.id)
      setSelectedPlaceId(null)
    })
  })

  return marker
}
