export type LocationChangeEvent = {
  latitude: number
  longitude: number
  radiusInMeters: number
}

export type MapLayerStyles = {
  square: {
    fillColor: string
    fillOpacity: number
    borderColor: string
    borderWidth: number
  }
}
