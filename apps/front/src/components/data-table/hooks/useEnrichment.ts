import { enrichKeys } from '@/api/queries/enrich/useEnrichWebsite'
import { webApiClient } from '@/hooks/useApi'
import { useAuth } from '@clerk/clerk-react'
import type { EnrichApiResponse, SearchResult } from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

export function useEnrichment<TData extends SearchResult>({
  data,
  setData,
  listId,
  searchId,
}: {
  data: TData[]
  setData: React.Dispatch<React.SetStateAction<TData[]>>
  listId?: string
  searchId?: string
}) {
  const [pendingFetches, setPendingFetches] = useState(new Set<string>())
  const queryClient = useQueryClient()
  const { getToken } = useAuth()

  const handleFetchEnrichment = async (selectedIds: string[]) => {
    if (selectedIds.length === 0) return

    setPendingFetches(new Set(selectedIds))

    // Set all selected rows to loading state
    setData((currentData) =>
      currentData.map((item) => ({
        ...item,
        enrichment: selectedIds.includes(item.id)
          ? { emails: [], socialLinks: {}, isLoading: true }
          : item.enrichment,
      })),
    )

    const token = await getToken()

    const fetchPromises = selectedIds.map(async (id) => {
      const item = data.find((item) => item.id === id)
      const website = item?.website

      if (!website) {
        // Update the item directly since there's no website
        setData((currentData) =>
          currentData.map((item) => {
            if (item.id === id) {
              return {
                ...item,
                enrichment: {
                  emails: [],
                  socialLinks: {},
                  error: 'No website available',
                  isLoading: false,
                },
              }
            }
            return item
          }),
        )
        return
      }

      try {
        // Use the query client to fetch using the same key as useEnrichWebsite
        const response = await queryClient.fetchQuery({
          queryKey: enrichKeys.website(id),
          queryFn: async () => {
            // Use the shared webApiClient from useApi.ts
            return webApiClient.fetchWithAuth<EnrichApiResponse>(
              `/enrich?id=${id}&website=${encodeURIComponent(website)}`,
              { method: 'GET' },
              token,
            )
          },
        })

        // Update the UI
        setData((currentData) =>
          currentData.map((item) => {
            if (item.id === id) {
              return {
                ...item,
                enrichment: {
                  ...response,
                  isLoading: false,
                },
              }
            }
            return item
          }),
        )
      } catch (error) {
        // Update the item with the error
        setData((currentData) =>
          currentData.map((item) => {
            if (item.id === id) {
              return {
                ...item,
                enrichment: {
                  emails: [],
                  socialLinks: {},
                  error:
                    error instanceof Error ? error.message : 'Failed to fetch',
                  isLoading: false,
                },
              }
            }
            return item
          }),
        )
      } finally {
        setPendingFetches((current) => {
          const updated = new Set(current)
          updated.delete(id)
          return updated
        })
      }
    })

    await Promise.allSettled(fetchPromises)

    // Invalidate the listContent query if we're in a list view
    if (listId) {
      queryClient.invalidateQueries({ queryKey: ['listContent', listId] })
    }
    // Invalidate the searchContent query if we're in a search view
    if (searchId) {
      queryClient.invalidateQueries({ queryKey: ['searchContent', searchId] })
    }
  }

  return {
    pendingFetches,
    handleFetchEnrichment,
  }
}
