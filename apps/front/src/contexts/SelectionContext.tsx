import {
  type PlaceTabValue,
  useMapStore,
} from '@/components/map-display/store/useMapStore'
import { type ReactNode, createContext, useCallback, useContext } from 'react'

interface SelectionContextValue {
  selectPlace: (placeId: string) => void
  selectPlaceAndTab: (placeId: string, tab: PlaceTabValue) => void
}

const SelectionContext = createContext<SelectionContextValue | null>(null)

interface SelectionProviderProps {
  children: ReactNode
  onSelectPlace: (placeId: string) => void
}

export const SelectionProvider = ({
  children,
  onSelectPlace,
}: SelectionProviderProps) => {
  const setActiveTab = useMapStore((state) => state.setActiveTab)

  const selectPlace = useCallback(
    (placeId: string) => {
      onSelectPlace(placeId)
    },
    [onSelectPlace],
  )

  const selectPlaceAndTab = useCallback(
    (placeId: string, tab: PlaceTabValue) => {
      onSelectPlace(placeId)
      setActiveTab(tab)
    },
    [onSelectPlace, setActiveTab],
  )

  return (
    <SelectionContext.Provider value={{ selectPlace, selectPlaceAndTab }}>
      {children}
    </SelectionContext.Provider>
  )
}

export const useSelection = (): SelectionContextValue => {
  const context = useContext(SelectionContext)
  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider')
  }
  return context
}

/**
 * Safe version that returns null if not within provider.
 * Useful for components that may or may not have selection capability.
 */
export const useSelectionSafe = (): SelectionContextValue | null => {
  return useContext(SelectionContext)
}
