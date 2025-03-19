import type { Place, StatusType } from '@ritchy/types'
import { create } from 'zustand'

interface MapStore {
  selectedPlaceId: string | null
  centerPlaceSpreadsheetId: string | null
  places: Place[]
  displayedPlaceIds: Set<string>
  updatedPlaceStatuses: Map<string, StatusType>
  tableData: Place[]

  setSelectedPlaceId: (id: string | null) => void
  setCenterPlaceSpreadsheetId: (id: string | null) => void
  setPlaces: (places: Place[]) => void
  setDisplayedPlaceIds: (ids: Set<string>) => void
  updatePlaceStatus: (placeId: string, status: StatusType) => void
  updatePlace: (placeId: string, updates: Partial<Place>) => void
  updateTableData: (updateFn: (prevData: Place[]) => Place[]) => void
  resetDisplayedPlaceIds: () => void
  addToDisplayedPlaceIds: (ids: string[]) => void
  removeFromDisplayedPlaceIds: (ids: string[]) => void
}

export const useMapStore = create<MapStore>((set) => ({
  selectedPlaceId: null,
  centerPlaceSpreadsheetId: null,
  places: [],
  displayedPlaceIds: new Set<string>(),
  updatedPlaceStatuses: new Map<string, StatusType>(),
  tableData: [],

  setSelectedPlaceId: (id) => set({ selectedPlaceId: id }),
  setCenterPlaceSpreadsheetId: (id) => set({ centerPlaceSpreadsheetId: id }),
  setPlaces: (places) =>
    set(() => {
      // Always initialize the displayed place IDs with all place IDs
      // This ensures markers show up immediately when places are loaded
      const placeIds = new Set(places.map((place) => place.id))

      return {
        places,
        tableData: places,
        displayedPlaceIds: placeIds,
      }
    }),
  resetDisplayedPlaceIds: () =>
    set((state) => ({
      displayedPlaceIds: new Set(state.places.map((place) => place.id)),
    })),
  setDisplayedPlaceIds: (ids) => set({ displayedPlaceIds: ids }),
  addToDisplayedPlaceIds: (ids: string[]) =>
    set((state) => {
      const newDisplayedIds = new Set(state.displayedPlaceIds)
      for (const id of ids) {
        newDisplayedIds.add(id)
      }
      return { displayedPlaceIds: newDisplayedIds }
    }),
  removeFromDisplayedPlaceIds: (ids: string[]) =>
    set((state) => {
      const newDisplayedIds = new Set(state.displayedPlaceIds)
      for (const id of ids) {
        newDisplayedIds.delete(id)
      }
      return { displayedPlaceIds: newDisplayedIds }
    }),
  updatePlaceStatus: (placeId, status) =>
    set((state) => {
      const newUpdates = new Map(state.updatedPlaceStatuses)
      newUpdates.set(placeId, status)

      const updatedStatus = {
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const updatedPlaces = state.places.map((place) => {
        if (place.id === placeId) {
          return {
            ...place,
            status: place.status ? { ...place.status, status } : updatedStatus,
          }
        }
        return place
      })

      const updatedTableData = state.tableData.map((place) => {
        if (place.id === placeId) {
          return {
            ...place,
            status: place.status ? { ...place.status, status } : updatedStatus,
          }
        }
        return place
      })

      return {
        updatedPlaceStatuses: newUpdates,
        places: updatedPlaces,
        tableData: updatedTableData,
      } as Partial<MapStore>
    }),
  updatePlace: (placeId, updates) =>
    set((state) => {
      const updatedPlaces = state.places.map((place) =>
        place.id === placeId ? { ...place, ...updates } : place,
      )

      const updatedTableData = state.tableData.map((place) =>
        place.id === placeId ? { ...place, ...updates } : place,
      )

      return {
        places: updatedPlaces,
        tableData: updatedTableData,
      }
    }),
  updateTableData: (updateFn) =>
    set((state) => ({
      tableData: updateFn(state.tableData),
    })),
}))
