import { useBatchEnrichment } from '@/api/mutations/enrichment/useBatchEnrichment'
import { useEnrichmentJobStatus } from '@/api/queries/enrich/useEnrichmentJobStatus'
import { listContentKeys } from '@/api/queries/lists/useListContent'
import { searchContentKeys } from '@/api/queries/search/useSearchContent'
import { Button } from '@/components/ui/button'
import { MagicWandIcon } from '@radix-ui/react-icons'
import type { SearchResult } from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'
import type { Table } from '@tanstack/react-table'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface EnrichmentButtonsProps<TData extends SearchResult> {
  table: Table<TData>
  listId?: string
  searchId?: string
}

// Simple helper to handle storage with TTL
const withTTL = {
  set: (key: string, value: string) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        value,
        expiry: Date.now() + 30 * 60 * 1000, // 30 min TTL
      }),
    )
  },
  get: (key: string) => {
    const item = localStorage.getItem(key)
    if (!item) return null

    const { value, expiry } = JSON.parse(item)
    if (Date.now() > expiry) {
      localStorage.removeItem(key)
      return null
    }
    return value
  },
  remove: (key: string) => localStorage.removeItem(key),
}

export const EnrichmentButtons = <TData extends SearchResult>({
  table,
  listId,
  searchId,
}: EnrichmentButtonsProps<TData>) => {
  const queryClient = useQueryClient()
  const storageKey = `jobId_${listId || searchId}`
  const [activeJobId, setActiveJobId] = useState<string | null>(() =>
    withTTL.get(storageKey),
  )
  const [progress, setProgress] = useState<number>(0)
  const selectedRows = table.getSelectedRowModel().rows
  const hasSelectedRows = selectedRows.length > 0
  const hasSelectedRowsWithWebsite = selectedRows.some(
    (row) => row.original.website,
  )
  const batchEnrichmentMutation = useBatchEnrichment()

  const jobStatusQuery = useEnrichmentJobStatus(
    activeJobId || '',
    !!activeJobId,
    5000,
  )

  const handleEnrichClick = async () => {
    const rowsToEnrich = hasSelectedRows
      ? selectedRows.filter((row) => row.original.website)
      : table.getFilteredRowModel().rows.filter((row) => row.original.website)
    try {
      const response = await batchEnrichmentMutation.mutateAsync({
        enrichments: rowsToEnrich.map((row) => ({
          website: row.original.website || '',
          userPlaceId: row.original.id,
        })),
      })
      if ('error' in response) {
        throw new Error(response.error)
      }
      setActiveJobId(response.jobId)
      withTTL.set(storageKey, response.jobId)
    } catch (error) {
      console.error('Enrichment failed:', error)
    }
  }

  useEffect(() => {
    if (jobStatusQuery.data && 'data' in jobStatusQuery.data) {
      const { data, status } = jobStatusQuery.data
      setProgress(
        Math.round((data.processedMessages / data.totalMessages) * 100),
      )
      if (status === 'completed' || status === 'failed') {
        setActiveJobId(null) // This will stop polling automatically
        withTTL.remove(storageKey)
        setProgress(100)
      }
      if (status === 'active') {
        const updatedProgress = Math.round(
          (data.processedMessages / data.totalMessages) * 100,
        )
        if (updatedProgress > progress) {
          if (listId) {
            queryClient.invalidateQueries({
              queryKey: listContentKeys.list(listId),
            })
          }
          if (searchId) {
            queryClient.invalidateQueries({
              queryKey: searchContentKeys.search(searchId),
            })
          }
          setProgress(updatedProgress)
        }
      }
    }
  }, [jobStatusQuery.data, listId, searchId, queryClient, progress, storageKey])

  const renderButtonContent = (itemCount: number, label: string) => {
    if (activeJobId && jobStatusQuery.data && 'data' in jobStatusQuery.data) {
      const { processedMessages, totalMessages } = jobStatusQuery.data.data

      return (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">
            {progress}% ({processedMessages}/{totalMessages})
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
          disabled={!!activeJobId}
          className={activeJobId ? 'h-auto' : ''}
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
        disabled={!!activeJobId}
        className={activeJobId ? 'h-auto' : ''}
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
