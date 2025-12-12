import { useEffect } from 'react'

interface UseTableKeyboardShortcutsOptions {
  onAddFilter?: () => void
  onClearFilters?: () => void
  onExport?: () => void
  onNextPage?: () => void
  onPrevPage?: () => void
  onSelectAll?: () => void
  enabled?: boolean
}

/**
 * Keyboard shortcuts for table interactions:
 * - `/` or `Ctrl+F`: Focus add filter
 * - `Escape`: Clear filters
 * - `Ctrl+E`: Export data
 * - `Alt+ArrowRight`: Next page
 * - `Alt+ArrowLeft`: Previous page
 * - `Ctrl+A`: Select all rows (when not in input)
 */
export const useTableKeyboardShortcuts = ({
  onAddFilter,
  onClearFilters,
  onExport,
  onNextPage,
  onPrevPage,
  onSelectAll,
  enabled = true,
}: UseTableKeyboardShortcutsOptions) => {
  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs, textareas, or contenteditable
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape to work even in inputs (to close popovers/clear focus)
        if (e.key === 'Escape' && onClearFilters) {
          target.blur()
          return
        }
        return
      }

      // `/` or `Ctrl+F`: Add filter
      if ((e.key === '/' || (e.ctrlKey && e.key === 'f')) && onAddFilter) {
        e.preventDefault()
        onAddFilter()
        return
      }

      // `Escape`: Clear filters
      if (e.key === 'Escape' && onClearFilters) {
        onClearFilters()
        return
      }

      // `Ctrl+E`: Export
      if (e.ctrlKey && e.key === 'e' && onExport) {
        e.preventDefault()
        onExport()
        return
      }

      // `Alt+ArrowRight`: Next page
      if (e.altKey && e.key === 'ArrowRight' && onNextPage) {
        e.preventDefault()
        onNextPage()
        return
      }

      // `Alt+ArrowLeft`: Previous page
      if (e.altKey && e.key === 'ArrowLeft' && onPrevPage) {
        e.preventDefault()
        onPrevPage()
        return
      }

      // `Ctrl+A`: Select all (when not in input)
      if (e.ctrlKey && e.key === 'a' && onSelectAll) {
        e.preventDefault()
        onSelectAll()
        return
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [
    enabled,
    onAddFilter,
    onClearFilters,
    onExport,
    onNextPage,
    onPrevPage,
    onSelectAll,
  ])
}
