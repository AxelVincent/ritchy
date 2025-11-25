import { useBulkEnrichment } from '@/api/mutations/enrichment/useBulkEnrichment'
import { useUserMe } from '@/api/queries/users/useUserMe'
import { useUpgradeModal } from '@/components/marketing/UpgradeModalContext'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { SearchResult } from '@ritchy/types'
import type { Table } from '@tanstack/react-table'
import { Sparkles } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { EnrichmentConfirmDialog } from './EnrichmentConfirmDialog'
import { CREDIT_COST_PER_ENRICHMENT, TEST_SIZE } from './constants'

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
  const { data: me } = useUserMe()
  const { showUpgradeModal } = useUpgradeModal()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    processed: 0,
  })

  const rowsToEnrich = hasSelectedRows
    ? selectedRows
    : table.getFilteredRowModel().rows

  const currentCredits = me?.credits.credits ?? 0

  // Get preview of first 5 rows for display in dialog
  const previewRows = rowsToEnrich.slice(0, 5).map((row) => ({
    name: row.original.name,
    address: row.original.address?.formattedAddress ?? 'No address',
    type: row.original.primaryType ?? row.original.types?.[0] ?? 'Unknown',
  }))

  const handleEnrichClick = async (mode: 'test' | 'full') => {
    try {
      const allUserPlaceIds = rowsToEnrich.map((row) => row.original.id)
      const userPlaceIds =
        mode === 'test' ? allUserPlaceIds.slice(0, TEST_SIZE) : allUserPlaceIds

      // Check if FREE user has no credits
      if (me?.plan === 'FREE' && currentCredits === 0) {
        // Close dialog and show upgrade modal
        setIsDialogOpen(false)
        showUpgradeModal('insufficient_credits', 0)
        return
      }

      const chunks = chunkArray(userPlaceIds, 500)
      setProgress({ current: 0, total: chunks.length, processed: 0 })

      // Process each chunk sequentially
      for (let i = 0; i < chunks.length; i++) {
        setProgress({
          current: i + 1,
          total: chunks.length,
          processed: i * 500 + Math.min(chunks[i].length, 500),
        })

        const response = await bulkEnrichmentMutation.mutateAsync({
          userPlaceIds: chunks[i],
        })

        if ('error' in response) {
          throw new Error(response.error)
        }
      }

      setIsDialogOpen(false)
      setProgress({ current: 0, total: 0, processed: 0 })
    } catch (error) {
      console.error('Enrichment failed:', error)
      setProgress({ current: 0, total: 0, processed: 0 })
    }
  }

  const renderButtonContent = (itemCount: number, label: string) => {
    if (bulkEnrichmentMutation.isPending) {
      const progressPercentage =
        progress.total > 0 ? (progress.current / progress.total) * 100 : 0
      const creditsUsed = progress.processed * CREDIT_COST_PER_ENRICHMENT

      return (
        <div className="flex flex-col gap-2 w-full py-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">
              Enriching {progress.processed} of {itemCount}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Chunk {progress.current} of {progress.total}
            </span>
            <span>{creditsUsed.toLocaleString()} credits used</span>
          </div>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4" />
        <span>
          {label} ({itemCount})
        </span>
      </div>
    )
  }

  const isProcessing = bulkEnrichmentMutation.isPending

  if (hasSelectedRows) {
    // Show "Enrich Selected" when rows are selected
    return (
      <>
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => setIsDialogOpen(true)}
            disabled={isProcessing}
            className={isProcessing ? 'h-auto' : ''}
          >
            {renderButtonContent(selectedRows.length, 'Enrich Selected')}
          </Button>
        </div>

        <EnrichmentConfirmDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          itemCount={selectedRows.length}
          currentCredits={currentCredits}
          onConfirm={handleEnrichClick}
          isProcessing={isProcessing}
          previewRows={previewRows}
        />
      </>
    )
  }

  return null
}
