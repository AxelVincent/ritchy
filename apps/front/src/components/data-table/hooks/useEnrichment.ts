import { useBatchEnrichment } from '@/api/mutations/enrichment/useBatchEnrichment'
import { useEnrichmentJobStatus } from '@/api/queries/enrich/useEnrichmentJobStatus'
import { placesKeys } from '@/api/queries/places/usePlaces'
import type { SearchResult } from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

// Helper functions for page-specific localStorage persistence
const getStorageKey = (listId?: string, searchId?: string): string => {
  if (listId) return `enrichment_active_job_list_${listId}`
  if (searchId) return `enrichment_active_job_search_${searchId}`
  return 'enrichment_active_job_default'
}

const getStoredJobData = (
  listId?: string,
  searchId?: string,
): string | null => {
  try {
    const key = getStorageKey(listId, searchId)
    const stored = localStorage.getItem(key)
    if (!stored) return null

    const data = JSON.parse(stored)
    // Check if the job is less than 24 hours old
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
    localStorage.setItem(
      key,
      JSON.stringify({
        jobId,
        timestamp: Date.now(),
      }),
    )
  } catch {
    // Ignore localStorage errors
  }
}

const clearStoredJobData = (listId?: string, searchId?: string): void => {
  try {
    const key = getStorageKey(listId, searchId)
    localStorage.removeItem(key)
  } catch {
    // Ignore localStorage errors
  }
}

export function useEnrichment<TData extends SearchResult>({
  listId,
  searchId,
}: {
  listId?: string
  searchId?: string
}) {
  const queryClient = useQueryClient()
  const activeJobIdRef = useRef<string | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingInProgressRef = useRef<boolean>(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [lastKnownStatus, setLastKnownStatus] = useState<string | null>(null)

  // Mutations and queries
  const batchEnrichmentMutation = useBatchEnrichment()
  const jobStatusQuery = useEnrichmentJobStatus(
    activeJobIdRef.current || '',
    isInitialized && !!activeJobIdRef.current,
  )

  // Initialize from localStorage on mount (page-specific)
  useEffect(() => {
    const storedJobId = getStoredJobData(listId, searchId)
    if (storedJobId) {
      activeJobIdRef.current = storedJobId
      startPolling()
    }
    setIsInitialized(true)
  }, [listId, searchId])

  // Polling function with overlap protection
  const performPolling = useCallback(async () => {
    if (isPollingInProgressRef.current) return
    isPollingInProgressRef.current = true

    try {
      const abortController = new AbortController()
      abortControllerRef.current = abortController
      if (abortController.signal.aborted) return

      const statusResult = await jobStatusQuery.refetch()
      if (abortController.signal.aborted) return

      // Determine which ID to use based on current view
      const currentId = listId || searchId
      const idType = listId ? 'listId' : 'searchId'
      const filters = { [idType]: currentId }
      const queryKey = [...placesKeys.all, 'filters', JSON.stringify(filters)]

      // Poll content data to get updated enrichment results
      queryClient.invalidateQueries({ queryKey })

      // Check for completion and show toast
      if (statusResult.data && 'status' in statusResult.data) {
        const currentStatus = statusResult.data.status

        // Show toast on completion
        if (currentStatus === 'completed' || currentStatus === 'error') {
          // Only show toast if we haven't shown it yet for this job
          if (lastKnownStatus !== 'completed' && lastKnownStatus !== 'error') {
            if (statusResult.data.data) {
              const { processedMessages, totalMessages, errors } =
                statusResult.data.data
              const successCount = processedMessages - (errors?.length || 0)
              const errorCount = errors?.length || 0

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
            }
          }

          // Stop polling since job is complete
          setLastKnownStatus(currentStatus)
          stopPolling()
        } else if (currentStatus === 'processing') {
          // Update status but continue polling
          setLastKnownStatus(currentStatus)
        }
      }
    } catch (error) {
      // Don't handle aborted requests as errors
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      console.error('Polling error:', error)
      // Show error toast for polling issues
      if (lastKnownStatus !== 'error') {
        toast.error('❌ Enrichment Error', {
          description:
            'Failed to check enrichment status. Please refresh the page.',
          duration: 6000,
        })
        setLastKnownStatus('error')
      }
    } finally {
      isPollingInProgressRef.current = false
      abortControllerRef.current = null
    }
  }, [jobStatusQuery, listId, searchId, queryClient, lastKnownStatus])

  // Start polling function
  const startPolling = useCallback(() => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    // Abort any in-progress polling request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Reset polling state
    isPollingInProgressRef.current = false

    // Start polling with overlap protection
    pollingIntervalRef.current = setInterval(performPolling, 5000)
  }, [performPolling])

  // Stop polling function
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    // Abort any in-progress polling request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Reset polling state
    isPollingInProgressRef.current = false
    activeJobIdRef.current = null
    setLastKnownStatus(null)
    clearStoredJobData(listId, searchId)
  }, [listId, searchId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }

      // Abort any in-progress polling request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }

      isPollingInProgressRef.current = false
    }
  }, [])

  // Handler function for starting enrichment
  const handleFetchEnrichment = useCallback(
    async (selectedIds: string[]): Promise<void> => {
      try {
        if (selectedIds.length === 0) {
          throw new Error('No items selected for enrichment')
        }

        // Determine which ID to use based on current view
        const currentId = listId || searchId
        const idType = listId ? 'listId' : 'searchId'
        const filters = { [idType]: currentId }
        const queryKey = [...placesKeys.all, 'filters', JSON.stringify(filters)]

        // Get current data to extract enrichments
        const currentData = queryClient.getQueryData<TData[]>(queryKey) || []

        // Get enrichments that need to be processed
        const enrichmentsToProcess = selectedIds
          .map((id) => {
            const item = currentData.find((d) => d.id === id)
            return item?.website ? { placeId: id, website: item.website } : null
          })
          .filter(Boolean) as Array<{ placeId: string; website: string }>

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

          // Show start toast
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
