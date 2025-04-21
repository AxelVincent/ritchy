import { create } from 'zustand'

interface MapStore {
  selectedPlaceId: string | null
  centerPlaceSpreadsheetId: string | null

  setSelectedPlaceId: (id: string | null) => void
  setCenterPlaceSpreadsheetId: (id: string | null) => void
}

export const useMapStore = create<MapStore>((set) => ({
  selectedPlaceId: null,
  centerPlaceSpreadsheetId: null,

  setSelectedPlaceId: (id) => set({ selectedPlaceId: id }),
  setCenterPlaceSpreadsheetId: (id) => set({ centerPlaceSpreadsheetId: id }),
}))
