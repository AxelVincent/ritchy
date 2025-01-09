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

export const validateAllSearchResultFieldsHaveColumns = (
  columns: {
    header: string
    field?: string
    accessor: (row: SearchResult) => unknown
  }[],
) => {
  const excludedFields = ['utcOffsetMinutes', 'addressComponents']
  // Get all fields from SearchResult schema
  const searchResultKeys = Object.keys(
    searchResultSchema.shape,
  ) as (keyof Required<SearchResult>)[]
  const missingFields: string[] = []

  for (const key of searchResultKeys) {
    // Skip checking excluded fields
    if (excludedFields.includes(key)) continue

    if (key === 'address') {
      // Get all address fields from the schema
      const addressKeys = Object.keys(
        searchResultSchema.shape.address.shape,
      ) as (keyof Required<SearchResult['address']>)[]

      for (const addressKey of addressKeys) {
        const hasAddressColumn = columns.some(
          (column) => column.field === `address.${addressKey}`,
        )
        if (!hasAddressColumn) {
          missingFields.push(`address.${addressKey}`)
        }
      }
      continue
    }

    const hasColumn = columns.some((column) => column.field === key)
    if (!hasColumn) {
      missingFields.push(key)
    }
  }

  if (missingFields.length > 0) {
    console.log(missingFields)
    throw new Error(
      `Missing column accessors for SearchResult fields: ${missingFields.join(', ')}`,
    )
  }
}

/**
 * Component that handles exporting search results to CSV format.
 * Includes enrichment data from website scraping if available.
 */
export const DataExport = ({ data }: DataExportProps) => {
  if (data.length === 0) return null

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

      // In the DataExport component, add this const with type assertion
      const columns = [
        {
          header: 'ID',
          field: 'id',
          accessor: (row: SearchResult): string => row.id,
        },
        {
          header: 'Name',
          field: 'displayName',
          accessor: (row: SearchResult): string => row.displayName,
        },
        {
          header: 'Website',
          field: 'websiteUri',
          accessor: (row: SearchResult): string => row.websiteUri || 'N/A',
        },
        {
          header: 'Emails',
          accessor: (row: SearchResult): string => {
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
          header: 'Google Maps URL',
          field: 'googleMapsUri',
          accessor: (row: SearchResult): string => row.googleMapsUri || 'N/A',
        },
        {
          header: 'Categories',
          field: 'types',
          accessor: (row: SearchResult): string => row.types.join(', '),
        },
        {
          header: 'Phone',
          field: 'internationalPhoneNumber',
          accessor: (row: SearchResult): string =>
            row.internationalPhoneNumber || 'N/A',
        },
        {
          header: 'Rating',
          field: 'rating',
          accessor: (row: SearchResult): string =>
            row.rating?.toString() || 'N/A',
        },
        {
          header: 'Number of Reviews',
          field: 'userRatingCount',
          accessor: (row: SearchResult): string =>
            row.userRatingCount?.toString() || 'N/A',
        },
        {
          header: 'Full Address',
          field: 'address.formattedAddress',
          accessor: (row: SearchResult): string =>
            row.address.formattedAddress || 'N/A',
        },
        {
          header: 'Country',
          field: 'address.country',
          accessor: (row: SearchResult): string => row.address.country || 'N/A',
        },
        {
          header: 'Locality',
          field: 'address.locality',
          accessor: (row: SearchResult): string =>
            row.address.locality || 'N/A',
        },
        {
          header: 'Sublocality',
          field: 'address.sublocality',
          accessor: (row: SearchResult): string =>
            row.address.sublocality || 'N/A',
        },
        {
          header: 'Postal Code',
          field: 'address.postalCode',
          accessor: (row: SearchResult): string =>
            row.address.postalCode || 'N/A',
        },
        {
          header: 'Postal Code Suffix',
          field: 'address.postalCodeSuffix',
          accessor: (row: SearchResult): string =>
            row.address.postalCodeSuffix || 'N/A',
        },
        {
          header: 'Plus Code',
          field: 'address.plusCode',
          accessor: (row: SearchResult): string =>
            row.address.plusCode || 'N/A',
        },
        {
          header: 'Street',
          field: 'address.street',
          accessor: (row: SearchResult): string => row.address.street || 'N/A',
        },
        {
          header: 'Neighborhood',
          field: 'address.neighborhood',
          accessor: (row: SearchResult): string =>
            row.address.neighborhood || 'N/A',
        },
        {
          header: 'Administrative Area Level 1',
          field: 'address.administrativeAreaLevel1',
          accessor: (row: SearchResult): string =>
            row.address.administrativeAreaLevel1 || 'N/A',
        },
        {
          header: 'Administrative Area Level 2',
          field: 'address.administrativeAreaLevel2',
          accessor: (row: SearchResult): string =>
            row.address.administrativeAreaLevel2 || 'N/A',
        },
        {
          header: 'Regular Opening Hours',
          field: 'regularOpeningHours',
          accessor: (row: SearchResult): string => {
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
                  const open = period?.open
                    ? `${period.open.day}:${period.open.hour}:${period.open.minute}`
                    : 'Unknown'
                  const close = period?.close
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
        {
          header: 'Location (lat, lng)',
          field: 'location',
          accessor: (row: SearchResult): string =>
            row.location
              ? `${row.location.latitude}, ${row.location.longitude}`
              : 'N/A',
        },
        {
          header: 'Primary Type',
          field: 'primaryType',
          accessor: (row: SearchResult): string => row.primaryType || 'N/A',
        },
        {
          header: 'Price Level',
          field: 'priceLevel',
          accessor: (row: SearchResult): string =>
            row.priceLevel?.toString() || 'N/A',
        },
        {
          header: 'Price Range',
          field: 'priceRange',
          accessor: (row: SearchResult): string => {
            if (!row.priceRange) return 'N/A'

            const formatPrice = (price: {
              currencyCode: string
              units: string
              nanos?: number
            }) => {
              const amount =
                Number(price.units) +
                (price.nanos ? price.nanos / 1_000_000_000 : 0)
              return `${price.currencyCode} ${amount.toFixed(2)}`
            }

            const start = row.priceRange.startPrice
              ? formatPrice(row.priceRange.startPrice)
              : 'N/A'
            const end = row.priceRange.endPrice
              ? formatPrice(row.priceRange.endPrice)
              : 'N/A'

            return `${start} - ${end}`
          },
        },
        {
          header: 'Short Address',
          field: 'shortFormattedAddress',
          accessor: (row: SearchResult): string =>
            row.shortFormattedAddress || 'N/A',
        },
        {
          header: 'Editorial Summary',
          field: 'editorialSummary',
          accessor: (row: SearchResult): string =>
            row.editorialSummary?.text || 'N/A',
        },
      ]

      validateAllSearchResultFieldsHaveColumns(columns)

      validateAndExportToCsv<SearchResult>({
        data,
        filename: 'places.csv',
        schema: searchResultSchema,
        columns,
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
