import { useUserSubscription } from '@/api/queries/users/useUserSubscription'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { validateAndExportToCsv } from '@/lib/exportToCsv'
import { isModelAvailable } from '@/lib/subscription'
import {
  type EnrichmentWithStatus,
  PlaceSchema,
  SOCIAL_MEDIA_CONFIG,
  type SearchResult,
} from '@ritchy/types'
import { useNavigate } from '@tanstack/react-router'
import { Download } from 'lucide-react'
import { useState } from 'react'
import React from 'react'

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
  const excludedFields = [
    'utcOffsetMinutes',
    'addressComponents',
    'notes',
    'enrichment',
  ]
  // Get all fields from SearchResult schema
  const searchResultKeys = Object.keys(
    PlaceSchema.shape,
  ) as (keyof Required<SearchResult>)[]
  const missingFields: string[] = []

  for (const key of searchResultKeys) {
    // Skip checking excluded fields
    if (excludedFields.includes(key)) continue

    if (key === 'address') {
      // Get all address fields from the schema
      const addressKeys = Object.keys(
        PlaceSchema.shape.address.shape,
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
export const DataExport = React.memo(({ data }: DataExportProps) => {
  if (data.length === 0) return null

  const [isExporting, setIsExporting] = useState(false)
  const { data: subscription } = useUserSubscription()
  const navigate = useNavigate()

  const handleExport = async () => {
    // Check if user has required subscription
    if (!isModelAvailable(subscription?.plan, 'NAVIGATOR')) {
      toast({
        title: 'Export requires a Navigator plan or higher',
        variant: 'default',
        action: (
          <Button onClick={() => navigate({ to: '/pricing' })}>
            View Plans
          </Button>
        ),
      })
      return
    }

    try {
      setIsExporting(true)

      // Create a Map of website URIs to enrichment data
      const enrichmentMap = new Map<string, EnrichmentWithStatus>(
        data
          .filter((row) => row.website)
          .map((row) => {
            // Ensure we always create a valid EnrichmentState object
            const baseEnrichmentState: EnrichmentWithStatus = {
              id: row.id,
              emails: [],
              socialLinks: {},
              isLoading: false,
              error: undefined,
            }

            const enrichData = row.enrichment as
              | EnrichmentWithStatus
              | undefined

            if (!enrichData || enrichData.error) {
              const state = {
                ...baseEnrichmentState,
                error: enrichData?.error,
              }
              return [row.website, state] as [string, EnrichmentWithStatus]
            }

            const state = {
              ...baseEnrichmentState,
              emails: enrichData.emails,
              socialLinks: enrichData.socialLinks,
            }
            return [row.website, state] as [string, EnrichmentWithStatus]
          }),
      )

      const columns = [
        {
          header: 'ID',
          field: 'id',
          accessor: (row: SearchResult): string => row.id,
        },
        {
          header: 'Name',
          field: 'name',
          accessor: (row: SearchResult): string => row.name,
        },
        {
          header: 'Website',
          field: 'website',
          accessor: (row: SearchResult): string => row.website || '',
        },
        {
          header: 'Emails',
          accessor: (row: SearchResult): string => {
            const enrichData = row.website
              ? enrichmentMap.get(row.website)
              : null
            return enrichData?.emails?.join(', ') || ''
          },
        },
        ...Object.keys(SOCIAL_MEDIA_CONFIG).map((platform) => ({
          header: `${platform.charAt(0).toUpperCase()}${platform.slice(1)}`,
          accessor: (row: SearchResult): string => {
            const enrichData = row.website
              ? enrichmentMap.get(row.website)
              : null
            return enrichData?.socialLinks[platform]?.join(', ') || ''
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
          field: 'phone',
          accessor: (row: SearchResult): string => row.phone || '',
        },
        {
          header: 'Rating',
          field: 'rating',
          accessor: (row: SearchResult): string => row.rating?.toString() || '',
        },
        {
          header: 'Number of Reviews',
          field: 'ratingCount',
          accessor: (row: SearchResult): string =>
            row.ratingCount?.toString() || '',
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
          header: 'Opening Hours',
          field: 'openingHours',
          accessor: (row: SearchResult): string => {
            const hours = row.openingHours

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
          header: 'Lists',
          field: 'lists',
          accessor: (row: SearchResult): string =>
            row.lists?.map((list) => `${list.emoji} ${list.name}`).join('| ') ||
            '',
        },
        {
          header: 'Status',
          field: 'status',
          accessor: (row: SearchResult): string => row.status?.status || '',
        },
      ]

      validateAllSearchResultFieldsHaveColumns(columns)

      validateAndExportToCsv<SearchResult>({
        data,
        filename: 'places.csv',
        schema: PlaceSchema,
        columns,
      })

      toast({
        title: 'Export successful',
        description: 'Your data has been exported to CSV',
      })
    } catch (error) {
      console.error('Export error:', error)
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
      <Download className="w-4 h-4 mr-2" />
      {isExporting ? 'Exporting...' : `Export to CSV (${data.length})`}
    </Button>
  )
})
