import { useExportUserPlaces } from '@/api/mutations/export/useExportUserPlaces'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTableSelectionContextSafe } from '@/contexts/TableSelectionContext'
import type {
  ContentFilters,
  PaginationMeta,
  SearchResult,
  SortOrder,
} from '@ritchy/types'
import type { Table } from '@tanstack/react-table'
import { Download, Loader2, X } from 'lucide-react'
import { useState } from 'react'
import { ListManagementButtons } from '../lists/ListManagementButtons'
import { ColumnsSelection } from './ColumnsSelection'
import { EnrichmentButtons } from './enrich/EnrichmentButtons'

interface DataTableToolbarProps {
  table: Table<SearchResult>
  listId?: string
  searchId?: string
  storageKey?: string
  isMobile?: boolean
  // Export props
  filters?: ContentFilters
  sortBy?: string
  sortOrder?: SortOrder
  pagination?: PaginationMeta
}

export const DataTableToolbar = ({
  table,
  listId,
  searchId,
  storageKey,
  isMobile,
  filters,
  sortBy,
  sortOrder,
  pagination,
}: DataTableToolbarProps) => {
  const tableSelection = useTableSelectionContextSafe()
  const exportMutation = useExportUserPlaces()
  const [showExportDialog, setShowExportDialog] = useState(false)

  const selectedCount = tableSelection?.selectedCount ?? 0
  const totalCount = pagination?.totalItems ?? tableSelection?.totalCount ?? 0

  // Derive single listId from filters if exactly one list is selected
  const singleListId =
    filters?.listIds?.length === 1 ? filters.listIds[0] : listId

  const handleExport = () => {
    exportMutation.mutate({
      searchId,
      filters,
      sortBy,
      sortOrder,
    })
    setShowExportDialog(false)
  }

  return (
    <div className="flex flex-row justify-between items-center px-3 py-2 gap-2 overflow-x-auto border-b border-border/60 bg-background/50">
      <div className="flex gap-2 items-center">
        {/* Selection count badge */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 h-9 px-4 py-2 bg-primary/10 rounded-md border border-primary/20">
            <span className="text-sm font-medium text-primary">
              {selectedCount} selected
            </span>
            {tableSelection && selectedCount < totalCount && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-primary/80 hover:text-primary"
                onClick={tableSelection.selectAll}
              >
                Select all {totalCount}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0 hover:bg-primary/20"
              onClick={tableSelection?.clearAll}
              aria-label="Clear selection"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </Button>
          </div>
        )}

        <EnrichmentButtons
          selectedIds={tableSelection?.selectedIds}
          listId={listId}
          searchId={searchId}
        />
        <ListManagementButtons
          selectedIds={tableSelection?.selectedIds}
          listId={singleListId}
        />
      </div>
      <div className="flex gap-2">
        {/* Export button - desktop only */}
        {!isMobile && totalCount > 0 && (
          <Button
            variant="outline"
            onClick={() => setShowExportDialog(true)}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {exportMutation.isPending
              ? 'Exporting...'
              : `Export (${totalCount})`}
          </Button>
        )}
        {/* Column selection - only show on desktop (meaningless with mobile card view) */}
        {!isMobile && (
          <ColumnsSelection table={table} storageKey={storageKey} />
        )}
      </div>

      {/* Export Confirmation Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export to CSV</DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block">
                You are about to export{' '}
                <strong>{totalCount.toLocaleString()}</strong> places matching
                your current filters.
              </span>
              <span className="block text-muted-foreground">
                This includes all data fields: contact information, company
                details, location data, and enrichment data.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
