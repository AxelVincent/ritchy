import { useBatchEnrichment } from '@/api/mutations/enrichment/useBatchEnrichment'
import { useEnrichmentJobStatus } from '@/api/queries/enrich/useEnrichmentJobStatus'
import { listContentKeys } from '@/api/queries/lists/useListContent'
import { searchContentKeys } from '@/api/queries/search/useSearchContent'
import type { SearchResult } from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

type UseEnrichmentProps = {
  listId?: string
  searchId?: string
}

export function useEnrichment<TData extends SearchResult>({
  listId,
  searchId,
}: UseEnrichmentProps) {
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const queryClient = useQueryClient()
  const batchEnrichmentMutation = useBatchEnrichment()
  const jobStatusQuery = useEnrichmentJobStatus(
    activeJobId || '',
    !!activeJobId,
  )

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    setActiveJobId(null)
  }, [])

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    pollingIntervalRef.current = setInterval(async () => {
      if (!activeJobId) return

      const statusResult = await jobStatusQuery.refetch()

      if (statusResult.data && 'status' in statusResult.data) {
        const status = statusResult.data.status

        // Invalidate queries if processing
        if (status === 'active' || status === 'waiting') {
          if (listId) {
            queryClient.invalidateQueries({
              queryKey: listContentKeys.list(listId),
            })
          } else if (searchId) {
            queryClient.invalidateQueries({
              queryKey: searchContentKeys.search(searchId),
            })
          }
        }

        // Stop polling if job is done
        if (['completed', 'failed', 'stalled'].includes(status)) {
          stopPolling()
        }
      }
    }, 5000)
  }, [activeJobId, jobStatusQuery, listId, searchId, queryClient, stopPolling])

  useEffect(() => {
    if (activeJobId) {
      startPolling()
    } else {
      stopPolling()
    }
    return () => stopPolling()
  }, [activeJobId, startPolling, stopPolling])

  const handleFetchEnrichment = useCallback(
    async (selectedIds: string[]): Promise<void> => {
      if (selectedIds.length === 0) return

      let currentData: TData[] = []
      if (listId) {
        const listData = queryClient.getQueryData(listContentKeys.list(listId))
        currentData = (listData as unknown as { items: TData[] })?.items || []
      } else if (searchId) {
        const searchData = queryClient.getQueryData(
          searchContentKeys.search(searchId),
        )
        currentData = (searchData as TData[]) || []
      }

      const enrichmentsToProcess = selectedIds
        .map((id) => {
          const item = currentData.find((d) => d.id === id)
          return item?.website
            ? { userPlaceId: id, website: item.website }
            : null
        })
        .filter(Boolean) as Array<{ userPlaceId: string; website: string }>

      if (enrichmentsToProcess.length === 0) return

      const response = await batchEnrichmentMutation.mutateAsync({
        enrichments: enrichmentsToProcess,
      })

      if ('jobId' in response) {
        setActiveJobId(response.jobId)
      }
    },
    [batchEnrichmentMutation, listId, searchId, queryClient],
  )

  return {
    handleFetchEnrichment,
    isEnriching: batchEnrichmentMutation.isPending || !!activeJobId,
    enrichmentProgress:
      jobStatusQuery.data && 'progress' in jobStatusQuery.data
        ? jobStatusQuery.data.progress
        : 0,
    enrichmentData:
      jobStatusQuery.data && 'data' in jobStatusQuery.data
        ? jobStatusQuery.data.data
        : null,
  }
}
