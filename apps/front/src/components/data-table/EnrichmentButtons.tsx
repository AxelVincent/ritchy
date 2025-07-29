import { Button } from '@/components/ui/button'
import { MagicWandIcon } from '@radix-ui/react-icons'
import type { SearchResult } from '@ritchy/types'
import type { Table } from '@tanstack/react-table'
import { Loader2 } from 'lucide-react'

interface EnrichmentButtonsProps<TData extends SearchResult> {
  table: Table<TData>
  isEnriching: boolean
  enrichmentProgress: number
  enrichmentData: {
    jobId: string
    totalMessages: number
    processedMessages: number
    remainingMessages: number
    startedAt: string
    completedAt?: string
    errors: string[]
  } | null
  handleFetchEnrichment: (ids: string[]) => Promise<void>
}

export const EnrichmentButtons = <TData extends SearchResult>({
  table,
  isEnriching,
  enrichmentProgress,
  enrichmentData,
  handleFetchEnrichment,
}: EnrichmentButtonsProps<TData>) => {
  const selectedRows = table.getSelectedRowModel().rows
  const hasSelectedRows = selectedRows.length > 0
  const hasSelectedRowsWithWebsite = selectedRows.some(
    (row) => row.original.website,
  )

  const handleEnrichClick = async () => {
    try {
      if (hasSelectedRows) {
        await handleFetchEnrichment(
          selectedRows
            .filter((row) => row.original.website)
            .map((row) => row.original.id),
        )
      } else {
        await handleFetchEnrichment(
          table
            .getFilteredRowModel()
            .rows.filter((row) => row.original.website)
            .map((row) => row.original.id),
        )
      }
    } catch (error) {
      console.error('Enrichment failed:', error)
    }
  }

  const renderButtonContent = (itemCount: number, label: string) => {
    if (isEnriching && enrichmentData) {
      const { processedMessages, totalMessages } = enrichmentData

      return (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">
            {enrichmentProgress}% ({processedMessages}/{totalMessages})
          </span>
        </div>
      )
    }

    return (
      <>
        <MagicWandIcon className="mr-2 h-4 w-4" />
        {label} ({itemCount})
      </>
    )
  }

  if (hasSelectedRows) {
    // Only show "Enrich Selected" when rows are selected
    return hasSelectedRowsWithWebsite ? (
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          onClick={handleEnrichClick}
          disabled={isEnriching}
          className={isEnriching ? 'h-auto' : ''}
        >
          {renderButtonContent(
            selectedRows.filter((row) => row.original.website).length,
            'Enrich Selected',
          )}
        </Button>
      </div>
    ) : null
  }

  // Show "Enrich All" only when no rows are selected
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        onClick={handleEnrichClick}
        disabled={isEnriching}
        className={isEnriching ? 'h-auto' : ''}
      >
        {renderButtonContent(
          table.getFilteredRowModel().rows.filter((row) => row.original.website)
            .length,
          'Enrich All',
        )}
      </Button>
    </div>
  )
}
