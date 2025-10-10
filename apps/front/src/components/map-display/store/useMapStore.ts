import { create } from 'zustand'

interface MapStore {
  selectedPlaceId: string | null
  centerPlaceSpreadsheetId: string | null
  activeTab: string | null
  focusField: string | null

  setSelectedPlaceId: (id: string | null) => void
  setCenterPlaceSpreadsheetId: (id: string | null) => void
  setActiveTab: (tab: string | null) => void
  selectPlaceAndTab: (placeId: string, tab: string, focusField?: string) => void
}

export const useMapStore = create<MapStore>((set) => ({
  selectedPlaceId: null,
  centerPlaceSpreadsheetId: null,
  activeTab: null,
  focusField: null,

  setSelectedPlaceId: (id) => set({ selectedPlaceId: id }),
  setCenterPlaceSpreadsheetId: (id) => set({ centerPlaceSpreadsheetId: id }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  selectPlaceAndTab: (placeId, tab, focusField) =>
    set({
      selectedPlaceId: placeId,
      activeTab: tab,
      focusField: focusField || null,
    }),
}))
