import { toast } from '@/hooks/use-toast'
import type { ContentFilters, SortOrder } from '@api/shared'
import { buildQueryString } from '@api/shared'
import { useAuth } from '@clerk/clerk-react'
import { useMutation } from '@tanstack/react-query'

export interface ExportUserPlacesParams {
  searchId?: string
  filters?: ContentFilters
  sortBy?: string
  sortOrder?: SortOrder
}

/**
 * Hook for exporting user places as CSV.
 * Triggers a file download when mutation succeeds.
 */
export const useExportUserPlaces = () => {
  const { getToken } = useAuth()

  return useMutation({
    mutationFn: async (params: ExportUserPlacesParams) => {
      const token = await getToken()

      // Build query string from params
      const queryParams: Record<string, unknown> = {
        searchId: params.searchId,
        ...params.filters,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      }

      const queryString = buildQueryString(queryParams)
      const baseUrl = import.meta.env.VITE_API_WEB_BASE_URL || '/api/web'
      const endpoint = `/user-places/export${queryString ? `?${queryString}` : ''}`

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      })

      if (!response.ok) {
        // Try to parse error response
        try {
          const errorData = await response.json()
          throw new Error(
            errorData.message || errorData.error || 'Export failed',
          )
        } catch {
          throw new Error(`Export failed: ${response.statusText}`)
        }
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `places_export_${new Date().toISOString().split('T')[0]}.csv`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match) {
          filename = match[1]
        }
      }

      // Get blob and trigger download
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      return { filename, size: blob.size }
    },
    onSuccess: (data) => {
      toast({
        title: 'Export successful',
        description: `Downloaded ${data.filename}`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Export failed',
        description:
          error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      })
    },
  })
}
