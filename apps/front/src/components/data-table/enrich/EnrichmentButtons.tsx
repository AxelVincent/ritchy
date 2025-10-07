import { useBulkEnrichment } from '@/api/mutations/enrichment/useBulkEnrichment'
import { Button } from '@/components/ui/button'
import type { SearchResult } from '@ritchy/types'
import type { Table } from '@tanstack/react-table'
import { Sparkles } from 'lucide-react'
import { Loader2 } from 'lucide-react'

interface EnrichmentButtonsProps<TData extends SearchResult> {
  table: Table<TData>
  listId?: string
  searchId?: string
}

// Helper to chunk array into smaller arrays
const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

export const EnrichmentButtons = <TData extends SearchResult>({
  table,
  // listId,
  // searchId,
}: EnrichmentButtonsProps<TData>) => {
  const selectedRows = table.getSelectedRowModel().rows
  const hasSelectedRows = selectedRows.length > 0
  const bulkEnrichmentMutation = useBulkEnrichment()

  const rowsToEnrich = hasSelectedRows
    ? selectedRows
    : table.getFilteredRowModel().rows

  const handleEnrichClick = async () => {
    try {
      const userPlaceIds = rowsToEnrich.map((row) => row.original.id)
      const chunks = chunkArray(userPlaceIds, 500)

      // Process each chunk sequentially
      for (let i = 0; i < chunks.length; i++) {
        const response = await bulkEnrichmentMutation.mutateAsync({
          userPlaceIds: chunks[i],
        })

        if ('error' in response) {
          throw new Error(response.error)
        }
      }
    } catch (error) {
      console.error('Enrichment failed:', error)
    }
  }

  const renderButtonContent = (itemCount: number, label: string) => {
    if (bulkEnrichmentMutation.isPending) {
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Starting enrichment...</span>
        </div>
      )
    }

    return (
      <>
        <Sparkles className="mr-2 h-4 w-4" />
        {label} ({itemCount})
      </>
    )
  }

  const isProcessing = bulkEnrichmentMutation.isPending

  if (hasSelectedRows) {
    // Show "Enrich Selected" when rows are selected
    return (
      <div className="flex flex-col gap-2">
        <Button
          onClick={handleEnrichClick}
          disabled={isProcessing}
          className={isProcessing ? 'h-auto' : ''}
        >
          {renderButtonContent(selectedRows.length, 'Enrich Selected')}
        </Button>
      </div>
    )
  }

  // Show "Enrich All" only when no rows are selected
  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleEnrichClick}
        disabled={isProcessing}
        className={isProcessing ? 'h-auto' : ''}
      >
        {renderButtonContent(rowsToEnrich.length, 'Enrich All')}
      </Button>
    </div>
  )
}
