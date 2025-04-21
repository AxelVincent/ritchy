import type { Place, StatusType } from '@ritchy/types'
import { create } from 'zustand'

interface MapStore {
  selectedPlaceId: string | null
  centerPlaceSpreadsheetId: string | null
  places: Place[]
  updatedPlaceStatuses: Map<string, StatusType>

  setSelectedPlaceId: (id: string | null) => void
  setCenterPlaceSpreadsheetId: (id: string | null) => void
  setPlaces: (places: Place[]) => void
  updatePlaceStatus: (placeId: string, status: StatusType) => void
  updatePlace: (placeId: string, updates: Partial<Place>) => void
}

export const useMapStore = create<MapStore>((set) => ({
  selectedPlaceId: null,
  centerPlaceSpreadsheetId: null,
  places: [],
  updatedPlaceStatuses: new Map<string, StatusType>(),

  setSelectedPlaceId: (id) => set({ selectedPlaceId: id }),
  setCenterPlaceSpreadsheetId: (id) => set({ centerPlaceSpreadsheetId: id }),
  setPlaces: (places) => set({ places }),
  updatePlaceStatus: (placeId, status) =>
    set((state) => {
      // Update the status in the updatedPlaceStatuses map
      const newUpdates = new Map(state.updatedPlaceStatuses)
      newUpdates.set(placeId, status)

      // Also update the status in the places array
      const updatedPlaces = state.places.map((place) => {
        if (place.id === placeId) {
          return {
            ...place,
            status: {
              ...place.status,
              status,
            },
          }
        }
        return place
      })

      return {
        updatedPlaceStatuses: newUpdates,
        places: updatedPlaces,
      } as Partial<MapStore>
    }),
  updatePlace: (placeId, updates) =>
    set((state) => ({
      places: state.places.map((place) =>
        place.id === placeId ? { ...place, ...updates } : place,
      ),
    })),
}))
