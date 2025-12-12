import { type ReactNode, createContext, useContext } from 'react'

interface TableSelectionContextValue {
  /** Check if a row is selected by ID */
  isSelected: (id: string) => boolean
  /** Toggle selection for a row by ID */
  toggle: (id: string) => void
  /** Select all available items */
  selectAll: () => void
  /** Clear all selections */
  clearAll: () => void
  /** Whether all items are selected */
  isAllSelected: boolean
  /** Whether some (but not all) items are selected */
  isSomeSelected: boolean
  /** Number of selected items */
  selectedCount: number
  /** Total number of available items */
  totalCount: number
  /** Set of currently selected IDs */
  selectedIds: Set<string>
}

const TableSelectionContext = createContext<TableSelectionContextValue | null>(
  null,
)

interface TableSelectionProviderProps {
  children: ReactNode
  value: TableSelectionContextValue
}

export const TableSelectionProvider = ({
  children,
  value,
}: TableSelectionProviderProps) => {
  return (
    <TableSelectionContext.Provider value={value}>
      {children}
    </TableSelectionContext.Provider>
  )
}

export const useTableSelectionContext = (): TableSelectionContextValue => {
  const context = useContext(TableSelectionContext)
  if (!context) {
    throw new Error(
      'useTableSelectionContext must be used within a TableSelectionProvider',
    )
  }
  return context
}

/**
 * Safe version that returns null if not within provider.
 * Useful for components that may or may not have table selection capability.
 */
export const useTableSelectionContextSafe =
  (): TableSelectionContextValue | null => {
    return useContext(TableSelectionContext)
  }
