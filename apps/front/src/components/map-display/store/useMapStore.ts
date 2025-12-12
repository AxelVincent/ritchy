import { create } from 'zustand'

// Define all valid tab values as a const array for runtime and type use
export const PLACE_TABS = [
  'details',
  'company_details',
  'contacts',
  'notes',
] as const
export type PlaceTabValue = (typeof PLACE_TABS)[number]

interface MapStore {
  // Used for map centering when clicking markers
  centerPlaceSpreadsheetId: string | null
  // Used for place details tab navigation
  activeTab: PlaceTabValue | null

  setCenterPlaceSpreadsheetId: (id: string | null) => void
  setActiveTab: (tab: PlaceTabValue | null) => void
}

/**
 * Minimal store for map-related state that needs to be shared.
 *
 * Note: Selection state (selectedPlaceId) is now managed by useMarkerSelection hook
 * and passed down via props for better colocation and simpler data flow.
 */
export const useMapStore = create<MapStore>((set) => ({
  centerPlaceSpreadsheetId: null,
  activeTab: null,

  setCenterPlaceSpreadsheetId: (id) => set({ centerPlaceSpreadsheetId: id }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}))
