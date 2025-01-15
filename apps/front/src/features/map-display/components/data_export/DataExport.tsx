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

    if (key === 'location') {
      // Check for both latitude and longitude columns
      const locationKeys = ['latitude', 'longitude']
      for (const locationKey of locationKeys) {
        const hasLocationColumn = columns.some(
          (column) => column.field === `location.${locationKey}`,
        )
        if (!hasLocationColumn) {
          missingFields.push(`location.${locationKey}`)
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
          accessor: (row: SearchResult): string => row.websiteUri || '',
        },
        {
          header: 'Emails',
          accessor: (row: SearchResult): string => {
            const enrichData = row.websiteUri
              ? enrichmentMap.get(row.websiteUri)
              : null
            return enrichData && !('error' in enrichData)
              ? enrichData.emails.join(', ')
              : ''
          },
        },
        ...Object.keys(SOCIAL_MEDIA_CONFIG).map((platform) => ({
          header: `${platform.charAt(0).toUpperCase()}${platform.slice(1)}`,
          accessor: (row: SearchResult): string => {
            const enrichData = row.websiteUri
              ? enrichmentMap.get(row.websiteUri)
              : null
            if (!enrichData || 'error' in enrichData) return ''
            return enrichData.socialLinks[platform]?.join(', ') || ''
          },
        })),
        {
          header: 'Google Maps URL',
          field: 'googleMapsUri',
          accessor: (row: SearchResult): string => row.googleMapsUri || '',
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
            row.internationalPhoneNumber || '',
        },
        {
          header: 'Rating',
          field: 'rating',
          accessor: (row: SearchResult): string => row.rating?.toString() || '',
        },
        {
          header: 'Number of Reviews',
          field: 'userRatingCount',
          accessor: (row: SearchResult): string =>
            row.userRatingCount?.toString() || '',
        },
        {
          header: 'Full Address',
          field: 'address.formattedAddress',
          accessor: (row: SearchResult): string =>
            row.address.formattedAddress || '',
        },
        {
          header: 'Short Address',
          field: 'address.shortFormattedAddress',
          accessor: (row: SearchResult): string =>
            row.address.shortFormattedAddress || '',
        },
        {
          header: 'Country',
          field: 'address.country',
          accessor: (row: SearchResult): string => row.address.country || '',
        },
        {
          header: 'Locality',
          field: 'address.locality',
          accessor: (row: SearchResult): string => row.address.locality || '',
        },
        {
          header: 'Sublocality',
          field: 'address.sublocality',
          accessor: (row: SearchResult): string =>
            row.address.sublocality || '',
        },
        {
          header: 'Postal Code',
          field: 'address.postalCode',
          accessor: (row: SearchResult): string => row.address.postalCode || '',
        },
        {
          header: 'Postal Code Suffix',
          field: 'address.postalCodeSuffix',
          accessor: (row: SearchResult): string =>
            row.address.postalCodeSuffix || '',
        },
        {
          header: 'Plus Code',
          field: 'address.plusCode',
          accessor: (row: SearchResult): string => row.address.plusCode || '',
        },
        {
          header: 'Street',
          field: 'address.street',
          accessor: (row: SearchResult): string => row.address.street || '',
        },
        {
          header: 'Neighborhood',
          field: 'address.neighborhood',
          accessor: (row: SearchResult): string =>
            row.address.neighborhood || '',
        },
        {
          header: 'Administrative Area Level 1',
          field: 'address.administrativeAreaLevel1',
          accessor: (row: SearchResult): string =>
            row.address.administrativeAreaLevel1 || '',
        },
        {
          header: 'Administrative Area Level 2',
          field: 'address.administrativeAreaLevel2',
          accessor: (row: SearchResult): string =>
            row.address.administrativeAreaLevel2 || '',
        },
        {
          header: 'Administrative Area Level 3',
          field: 'address.administrativeAreaLevel3',
          accessor: (row: SearchResult): string =>
            row.address.administrativeAreaLevel3 || '',
        },
        {
          header: 'Regular Opening Hours',
          field: 'regularOpeningHours',
          accessor: (row: SearchResult): string => {
            const hours = row.regularOpeningHours

            // Handle cases where no opening hours data exists
            if (!hours) return ''

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

            return ''
          },
        },
        {
          header: 'Latitude',
          field: 'location.latitude',
          accessor: (row: SearchResult): string =>
            row.location?.latitude?.toString() || '',
        },
        {
          header: 'Longitude',
          field: 'location.longitude',
          accessor: (row: SearchResult): string =>
            row.location?.longitude?.toString() || '',
        },
        {
          header: 'Primary Type',
          field: 'primaryType',
          accessor: (row: SearchResult): string => row.primaryType || '',
        },
        {
          header: 'Price Level',
          field: 'priceLevel',
          accessor: (row: SearchResult): string =>
            row.priceLevel?.toString() || '',
        },
        {
          header: 'Price Range',
          field: 'priceRange',
          accessor: (row: SearchResult): string => {
            if (!row.priceRange) return ''

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
              : ''
            const end = row.priceRange.endPrice
              ? formatPrice(row.priceRange.endPrice)
              : ''

            return `${start} - ${end}`
          },
        },
        {
          header: 'Editorial Summary',
          field: 'editorialSummary',
          accessor: (row: SearchResult): string =>
            row.editorialSummary?.text || '',
        },
        {
          header: 'Associated Lists',
          field: 'associatedLists',
          accessor: (row: SearchResult): string =>
            row.associatedLists
              ?.map((list) => `${list.emoji} ${list.name}`)
              .join('| ') || '',
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
