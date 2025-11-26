import { create } from 'zustand'

// Define all valid tab values as a const array for runtime and type use
export const PLACE_TABS = [
  'details',
  'company_details',
  'contacts',
  'notes',
  'reviews',
] as const
export type PlaceTabValue = (typeof PLACE_TABS)[number]

interface MapStore {
  selectedPlaceId: string | null
  centerPlaceSpreadsheetId: string | null
  activeTab: PlaceTabValue | null
  selectionSource: 'map' | 'table' | null

  setSelectedPlaceId: (id: string | null, source?: 'map' | 'table') => void
  setCenterPlaceSpreadsheetId: (id: string | null) => void
  setActiveTab: (tab: PlaceTabValue | null) => void
  selectPlaceAndTab: (placeId: string, tab: PlaceTabValue) => void
}

export const useMapStore = create<MapStore>((set) => ({
  selectedPlaceId: null,
  centerPlaceSpreadsheetId: null,
  activeTab: null,
  selectionSource: null,

  setSelectedPlaceId: (id, source = 'map') =>
    set({ selectedPlaceId: id, selectionSource: source }),
  setCenterPlaceSpreadsheetId: (id) => set({ centerPlaceSpreadsheetId: id }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  selectPlaceAndTab: (placeId, tab) =>
    set({
      selectedPlaceId: placeId,
      activeTab: tab,
      selectionSource: 'table',
    }),
}))
