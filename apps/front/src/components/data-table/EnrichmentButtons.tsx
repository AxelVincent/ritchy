import { Button } from '@/components/ui/button'
import { MagicWandIcon } from '@radix-ui/react-icons'
import type { SearchResult } from '@ritchy/types'
import type { Table } from '@tanstack/react-table'
import { Loader2 } from 'lucide-react'

interface EnrichmentButtonsProps<TData extends SearchResult> {
  table: Table<TData>
  pendingFetches: Set<string>
  handleFetchEnrichment: (ids: string[]) => void
}

export const EnrichmentButtons = <TData extends SearchResult>({
  table,
  pendingFetches,
  handleFetchEnrichment,
}: EnrichmentButtonsProps<TData>) => {
  const selectedRows = table.getSelectedRowModel().rows
  const hasSelectedRows = selectedRows.length > 0
  const hasSelectedRowsWithWebsite = selectedRows.some(
    (row) => row.original.website,
  )

  if (hasSelectedRows) {
    // Only show "Enrich Selected" when rows are selected
    return hasSelectedRowsWithWebsite ? (
      <Button
        variant="outline"
        onClick={() =>
          handleFetchEnrichment(
            selectedRows
              .filter((row) => row.original.website)
              .map((row) => row.original.id),
          )
        }
        disabled={pendingFetches.size > 0}
      >
        {pendingFetches.size > 0 ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enriching ({pendingFetches.size} remaining)
          </>
        ) : (
          <>
            <MagicWandIcon className="mr-2 h-4 w-4" />
            Enrich Selected (
            {selectedRows.filter((row) => row.original.website).length})
          </>
        )}
      </Button>
    ) : null
  }

  // Show "Enrich All" only when no rows are selected
  return (
    <Button
      variant="outline"
      onClick={() =>
        handleFetchEnrichment(
          table
            .getFilteredRowModel()
            .rows.filter((row) => row.original.website)
            .map((row) => row.original.id),
        )
      }
      disabled={pendingFetches.size > 0}
    >
      {pendingFetches.size > 0 ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Enriching ({pendingFetches.size} remaining)
        </>
      ) : (
        <>
          <MagicWandIcon className="mr-2 h-4 w-4" />
          Enrich All (
          {
            table
              .getFilteredRowModel()
              .rows.filter((row) => row.original.website).length
          }
          )
        </>
      )}
    </Button>
  )
}
