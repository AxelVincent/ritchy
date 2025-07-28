import { useBatchEnrichment } from '@/api/mutations/enrichment/useBatchEnrichment'
import { useEnrichmentJobStatus } from '@/api/queries/enrich/useEnrichmentJobStatus'
import { listContentKeys } from '@/api/queries/lists/useListContent'
import { searchContentKeys } from '@/api/queries/search/useSearchContent'
import type { SearchResult } from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

// Constants
const POLLING_INTERVALS = {
  ACTIVE: 5000,
  DEFAULT: 10000,
} as const

const JOB_STORAGE_PREFIX = 'enrichment_active_job' as const

// Types
type JobStorageData = {
  jobId: string
  timestamp: number
}

type UseEnrichmentProps = {
  listId?: string
  searchId?: string
}

// Helper functions
const getStorageKey = (listId?: string, searchId?: string): string => {
  if (listId) return `${JOB_STORAGE_PREFIX}_list_${listId}`
  if (searchId) return `${JOB_STORAGE_PREFIX}_search_${searchId}`
  return `${JOB_STORAGE_PREFIX}_default`
}

const getStoredJobData = (
  listId?: string,
  searchId?: string,
): string | null => {
  try {
    const key = getStorageKey(listId, searchId)
    const stored = localStorage.getItem(key)
    if (!stored) return null

    const data = JSON.parse(stored) as JobStorageData
    const isRecent = Date.now() - data.timestamp < 24 * 60 * 60 * 1000
    return isRecent ? data.jobId : null
  } catch {
    return null
  }
}

const setStoredJobData = (
  jobId: string,
  listId?: string,
  searchId?: string,
): void => {
  try {
    const key = getStorageKey(listId, searchId)
    const data: JobStorageData = { jobId, timestamp: Date.now() }
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // Ignore localStorage errors
  }
}

const clearStoredJobData = (listId?: string, searchId?: string): void => {
  try {
    localStorage.removeItem(getStorageKey(listId, searchId))
  } catch {
    // Ignore localStorage errors
  }
}

export function useEnrichment<TData extends SearchResult>({
  listId,
  searchId,
}: UseEnrichmentProps) {
  // Refs for managing polling state
  const activeJobIdRef = useRef<string | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // State
  const [isInitialized, setIsInitialized] = useState(false)
  const [lastKnownStatus, setLastKnownStatus] = useState<string | null>(null)

  // Hooks
  const queryClient = useQueryClient()
  const batchEnrichmentMutation = useBatchEnrichment()
  const jobStatusQuery = useEnrichmentJobStatus(
    activeJobIdRef.current || '',
    isInitialized && !!activeJobIdRef.current,
  )

  // Cleanup polling resources
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    activeJobIdRef.current = null
    setLastKnownStatus(null)
    clearStoredJobData(listId, searchId)
  }, [listId, searchId])

  // Handle job status updates
  const handleJobStatusUpdate = useCallback(
    (
      status: string,
      jobData?: {
        processedMessages: number
        totalMessages: number
        errors: string[]
      },
    ) => {
      // Invalidate queries if job is processing
      if (
        (status === 'active' || status === 'waiting') &&
        jobData?.processedMessages
      ) {
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

      // Handle completion states
      if (status === 'completed' || status === 'failed') {
        if (lastKnownStatus !== status && jobData) {
          const { processedMessages, totalMessages, errors = [] } = jobData
          const successCount = processedMessages - errors.length
          const errorCount = errors.length

          if (status === 'completed') {
            if (errorCount > 0) {
              toast.warning('⚠️ Enrichment Completed with Errors', {
                description: `${successCount} items enriched successfully, ${errorCount} failed`,
                duration: 8000,
              })
            } else {
              toast('✅ Enrichment Complete!', {
                description: `Successfully enriched ${totalMessages} items`,
                duration: 5000,
              })
            }
          } else {
            toast.error('❌ Enrichment Failed', {
              description: `Failed to process ${errorCount} items`,
              duration: 6000,
            })
          }
        }
        stopPolling()
      } else if (status === 'stalled') {
        toast.error('❌ Enrichment Error', {
          description: 'Enrichment job stalled. Please try again.',
          duration: 6000,
        })
        stopPolling()
      }

      setLastKnownStatus(status)
    },
    [lastKnownStatus, listId, queryClient, searchId, stopPolling],
  )

  // Poll for job status
  const pollJobStatus = useCallback(async () => {
    if (!activeJobIdRef.current) return

    try {
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      if (abortController.signal.aborted) return

      const statusResult = await jobStatusQuery.refetch()

      if (abortController.signal.aborted) return

      if (statusResult.data && 'status' in statusResult.data) {
        handleJobStatusUpdate(statusResult.data.status, statusResult.data.data)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return

      console.error('Polling error:', error)

      if (lastKnownStatus !== 'error') {
        toast.error('❌ Enrichment Error', {
          description:
            'Failed to check enrichment status. Please refresh the page.',
          duration: 6000,
        })
        setLastKnownStatus('error')
      }

      stopPolling()
    }
  }, [jobStatusQuery, handleJobStatusUpdate, lastKnownStatus, stopPolling])

  // Start polling with dynamic interval
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    void pollJobStatus()

    pollingIntervalRef.current = setInterval(
      pollJobStatus,
      lastKnownStatus === 'active'
        ? POLLING_INTERVALS.ACTIVE
        : POLLING_INTERVALS.DEFAULT,
    )
  }, [pollJobStatus, lastKnownStatus])

  // Initialize from localStorage
  useEffect(() => {
    const storedJobId = getStoredJobData(listId, searchId)
    if (storedJobId) {
      activeJobIdRef.current = storedJobId
      startPolling()
    }
    setIsInitialized(true)
  }, [listId, searchId, startPolling])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Start enrichment process
  const handleFetchEnrichment = useCallback(
    async (selectedIds: string[]): Promise<void> => {
      try {
        if (selectedIds.length === 0) {
          throw new Error('No items selected for enrichment')
        }

        // Get current data
        let currentData: TData[] = []
        if (listId) {
          const listData = queryClient.getQueryData(
            listContentKeys.list(listId),
          )
          currentData = (listData as unknown as { items: TData[] })?.items || []
        } else if (searchId) {
          const searchData = queryClient.getQueryData(
            searchContentKeys.search(searchId),
          )
          currentData = (searchData as TData[]) || []
        }

        // Process enrichments
        const enrichmentsToProcess = selectedIds
          .map((id) => {
            const item = currentData.find((d) => d.id === id)
            return item?.website
              ? { userPlaceId: id, website: item.website }
              : null
          })
          .filter(Boolean) as Array<{ userPlaceId: string; website: string }>

        if (enrichmentsToProcess.length === 0) {
          throw new Error('No valid websites found for enrichment')
        }

        // Start batch enrichment
        const response = await batchEnrichmentMutation.mutateAsync({
          enrichments: enrichmentsToProcess,
        })

        if ('jobId' in response) {
          activeJobIdRef.current = response.jobId
          setStoredJobData(response.jobId, listId, searchId)
          setLastKnownStatus('processing')
          startPolling()

          toast('🚀 Enrichment Started', {
            description: `Processing ${response.enrichmentCount} websites...`,
          })
        }
      } catch (error) {
        toast.error('❌ Failed to Start Enrichment', {
          description:
            error instanceof Error ? error.message : 'Unknown error occurred',
          duration: 5000,
        })
        throw error
      }
    },
    [batchEnrichmentMutation, listId, searchId, queryClient, startPolling],
  )

  return {
    handleFetchEnrichment,
    isEnriching:
      batchEnrichmentMutation.isPending || activeJobIdRef.current !== null,
    enrichmentProgress:
      jobStatusQuery.data && 'progress' in jobStatusQuery.data
        ? jobStatusQuery.data.progress
        : 0,
    enrichmentData:
      jobStatusQuery.data && 'data' in jobStatusQuery.data
        ? jobStatusQuery.data.data
        : null,
    enrichmentError:
      batchEnrichmentMutation.error?.message ||
      (jobStatusQuery.data && 'error' in jobStatusQuery.data
        ? String(jobStatusQuery.data.error)
        : null),
  }
}
