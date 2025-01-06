import { enrichKeys } from '@/api/queries/enrich/useEnrichWebsite'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { validateAndExportToCsv } from '@/lib/exportToCsv'
import {
  type EnrichApiResponse,
  SOCIAL_MEDIA_CONFIG,
  type SearchResult,
  searchResultSchema,
} from '@ritchy/types'
import { type QueryClient, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

/**
 * Helper function to safely retrieve enrichment data from the query cache
 * @param queryClient - TanStack Query client instance
 * @param websiteUri - Website URI to lookup enrichment data for
 * @returns EnrichApiResponse if found, null otherwise
 */
const getEnrichmentData = (
  queryClient: QueryClient,
  websiteUri: string | null,
): EnrichApiResponse | null => {
  if (!websiteUri) return null
  return (
    queryClient.getQueryData<EnrichApiResponse>(
      enrichKeys.website(websiteUri),
    ) ?? null
  )
}

interface DataExportProps {
  /** Array of search results to export */
  data: SearchResult[]
}

/**
 * Component that handles exporting search results to CSV format.
 * Includes enrichment data from website scraping if available.
 */
export const DataExport = ({ data }: DataExportProps) => {
  const queryClient = useQueryClient()
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const handleExport = async () => {
    try {
      setIsExporting(true)

      // Create a Map of website URIs to enrichment data
      const enrichmentMap = new Map(
        data
          .filter((row) => row.websiteUri)
          .map((row) => [
            row.websiteUri,
            getEnrichmentData(queryClient, row.websiteUri),
          ]),
      )
      queryClient.clear()

      validateAndExportToCsv<SearchResult>({
        data,
        filename: 'places.csv',
        schema: searchResultSchema,
        columns: [
          {
            header: 'ID',
            accessor: (row): string => row.id,
          },
          {
            header: 'Name',
            accessor: (row): string => row.displayName,
          },
          {
            header: 'Website',
            accessor: (row): string => row.websiteUri || 'N/A',
          },
          {
            header: 'Emails',
            accessor: (row): string => {
              const enrichData = row.websiteUri
                ? enrichmentMap.get(row.websiteUri)
                : null
              return enrichData && !('error' in enrichData)
                ? enrichData.emails.join(', ')
                : 'N/A'
            },
          },
          ...Object.keys(SOCIAL_MEDIA_CONFIG).map((platform) => ({
            header: `${platform.charAt(0).toUpperCase()}${platform.slice(1)}`,
            accessor: (row: SearchResult): string => {
              const enrichData = row.websiteUri
                ? enrichmentMap.get(row.websiteUri)
                : null
              if (!enrichData || 'error' in enrichData) return 'N/A'
              return enrichData.socialLinks[platform]?.join(', ') || 'N/A'
            },
          })),
          {
            header: 'Google Maps',
            accessor: (row): string => row.googleMapsUri ?? 'N/A',
          },
          {
            header: 'Categories',
            accessor: (row): string => row.types.join(', '),
          },
          {
            header: 'Phone',
            accessor: (row): string => row.internationalPhoneNumber || 'N/A',
          },
          {
            header: 'Rating',
            accessor: (row): string => row.rating?.toString() || 'N/A',
          },
          {
            header: 'Number of Reviews',
            accessor: (row): string => row.userRatingCount?.toString() || 'N/A',
          },
          {
            header: 'Address',
            accessor: (row): string => row.formattedAddress || 'N/A',
          },
          {
            header: 'Opening Hours',
            accessor: (row): string => {
              const hours = row.regularOpeningHours

              // Handle cases where no opening hours data exists
              if (!hours) return 'N/A'

              // If we have weekday descriptions, use those as they're pre-formatted
              if (hours.weekdayDescriptions?.length) {
                return hours.weekdayDescriptions.join(' | ')
              }

              // If we have periods but no descriptions, format the periods
              if (hours.periods?.length) {
                return hours.periods
                  .map((period) => {
                    const open = period.open
                      ? `${period.open.day}:${period.open.hour}:${period.open.minute}`
                      : 'Unknown'
                    const close = period.close
                      ? `${period.close.day}:${period.close.hour}:${period.close.minute}`
                      : 'Unknown'
                    return `${open}-${close}`
                  })
                  .join(' | ')
              }

              // If we only have openNow status
              if (typeof hours.openNow === 'boolean') {
                return hours.openNow ? 'Currently Open' : 'Currently Closed'
              }

              return 'N/A'
            },
          },
        ],
      })

      toast({
        title: 'Export successful',
        description: 'Your data has been exported to CSV',
      })
    } catch (error) {
      toast({
        title: 'Export failed',
        description:
          error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={isExporting}>
      {isExporting ? 'Exporting...' : `Export to CSV (${data.length})`}
    </Button>
  )
}
