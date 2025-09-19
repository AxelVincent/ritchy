import { useUserMe } from '@/api/queries/users/useUserMe'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { validateAndExportToCsv } from '@/lib/exportToCsv'
import { useUser } from '@clerk/clerk-react'
import { PlaceSchema, type SearchResult } from '@ritchy/types'
import { useNavigate } from '@tanstack/react-router'
import { Download } from 'lucide-react'
import posthog from 'posthog-js'
import { useState } from 'react'
import React from 'react'

interface DataExportProps {
  /** Array of search results to export. If selectedRows is undefined, all data will be exported */
  selectedRows?: SearchResult[]
}

export const validateAllSearchResultFieldsHaveColumns = (
  columns: {
    header: string
    field?: string
    accessor: (row: SearchResult) => unknown
  }[],
) => {
  const excludedFields = [
    'sourceId',
    'utcOffsetMinutes',
    'notes',
    'enrichment',
    'searchId',
    'listId',
    'hubspotSynced',
    'isDeleted',
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
export const DataExport = React.memo(({ selectedRows }: DataExportProps) => {
  if (!selectedRows?.length) return null

  const [isExporting, setIsExporting] = useState(false)
  const { data: me } = useUserMe()
  const userPlan = me?.plan || 'FREE'
  const { user } = useUser()
  const navigate = useNavigate()

  const handleExport = async () => {
    // Check if user has required subscription
    if (userPlan === 'FREE') {
      posthog.capture('data_export_blocked_free_user', {
        user_id: user?.id,
        email: user?.primaryEmailAddress?.emailAddress,
        name: `${user?.firstName} ${user?.lastName}`.trim(),
      })
      toast({
        title: 'Export requires an ESSENTIALS plan or higher',
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

      // Create a copy of the data with properly structured fields
      const exportData = selectedRows.map((row) => ({
        ...row,
        // Convert string dates back to Date objects for schema validation
        domainRegisteredAt: row.domainRegisteredAt
          ? new Date(row.domainRegisteredAt)
          : null,
        enrichedStatus: row.enrichedStatus || null,
        // Ensure contact arrays are properly structured
        contactEmails: (row.contactEmails || []).map((email) => ({
          ...email,
          isPrimary: email.isPrimary ?? false,
          contactId: email.contactId || row.id,
          source: email.source || '',
          isVerified: email.isVerified ?? false,
          createdAt: email.createdAt ? new Date(email.createdAt) : new Date(),
          updatedAt: email.updatedAt ? new Date(email.updatedAt) : new Date(),
        })),
        contactPhones: (row.contactPhones || [])
          .filter((phone) => phone?.phone && phone.phone.trim() !== '')
          .map((phone) => ({
            ...phone,
            isPrimary: phone.isPrimary ?? false,
            createdAt: phone.createdAt ? new Date(phone.createdAt) : new Date(),
            updatedAt: phone.updatedAt ? new Date(phone.updatedAt) : new Date(),
          })),
        contactLinkedins: (row.contactLinkedins || [])
          .filter((social) => social?.url && social.url.trim() !== '')
          .map((social) => ({
            ...social,
            socialMediaPlatform: 'LINKEDIN' as const,
            isPrimary: social.isPrimary ?? false,
            contactId: social.contactId || row.id,
            createdAt: social.createdAt
              ? new Date(social.createdAt)
              : new Date(),
            updatedAt: social.updatedAt
              ? new Date(social.updatedAt)
              : new Date(),
          })),
        contactFacebooks: (row.contactFacebooks || [])
          .filter((social) => social?.url && social.url.trim() !== '')
          .map((social) => ({
            ...social,
            socialMediaPlatform: 'FACEBOOK' as const,
            isPrimary: social.isPrimary ?? false,
            contactId: social.contactId || row.id,
            createdAt: social.createdAt
              ? new Date(social.createdAt)
              : new Date(),
            updatedAt: social.updatedAt
              ? new Date(social.updatedAt)
              : new Date(),
          })),
        contactInstagrams: (row.contactInstagrams || [])
          .filter((social) => social?.url && social.url.trim() !== '')
          .map((social) => ({
            ...social,
            socialMediaPlatform: 'INSTAGRAM' as const,
            isPrimary: social.isPrimary ?? false,
            contactId: social.contactId || row.id,
            createdAt: social.createdAt
              ? new Date(social.createdAt)
              : new Date(),
            updatedAt: social.updatedAt
              ? new Date(social.updatedAt)
              : new Date(),
          })),
        // Ensure lists have required fields
        lists: (row.lists || []).map((list) => ({
          ...list,
          name: list.name || '',
          emoji: list.emoji || '',
        })),
        // Ensure notes have required fields
        notes: (row.notes || []).map((note) => ({
          ...note,
          id: note.id || crypto.randomUUID(),
          userPlaceId: note.userPlaceId || row.id,
          note: note.note || '',
          userId: note.userId || '',
          createdAt: note.createdAt ? new Date(note.createdAt) : new Date(),
          updatedAt: note.updatedAt ? new Date(note.updatedAt) : new Date(),
        })),
      }))

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
          header: 'Short Description',
          field: 'shortDescription',
          accessor: (row: SearchResult): string => row.shortDescription || '',
        },

        {
          header: 'Primary Category',
          field: 'primaryType',
          accessor: (row: SearchResult): string => row.primaryType || '',
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
          header: 'Phones',
          field: 'contactPhones',
          accessor: (row: SearchResult): string =>
            (row.contactPhones || []).join(', '),
        },
        {
          header: 'Emails',
          field: 'contactEmails',
          accessor: (row: SearchResult): string =>
            row.contactEmails?.map((e) => e.email).join(', ') || '',
        },
        {
          header: 'LinkedIn Socials',
          field: 'contactLinkedins',
          accessor: (row: SearchResult): string =>
            row.contactLinkedins?.map((s) => s.url).join(', ') || '',
        },
        {
          header: 'Facebook Socials',
          field: 'contactFacebooks',
          accessor: (row: SearchResult): string =>
            row.contactFacebooks?.map((s) => s.url).join(', ') || '',
        },
        {
          header: 'Instagram Socials',
          field: 'contactInstagrams',
          accessor: (row: SearchResult): string =>
            row.contactInstagrams?.map((s) => s.url).join(', ') || '',
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
              units?: string
              nanos?: number
            }) => {
              const amount =
                Number(price.units || '0') +
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
          header: 'Street Number',
          field: 'address.streetNumber',
          accessor: (row: SearchResult): string =>
            row.address.streetNumber || '',
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
          header: 'Source',
          field: 'source',
          accessor: (row: SearchResult): string => row.source,
        },
        {
          header: 'Source ID',
          field: 'sourceId',
          accessor: (row: SearchResult): string => row.sourceId,
        },
        {
          header: 'Source URL',
          field: 'sourceUrl',
          accessor: (row: SearchResult): string => row.sourceUrl || '',
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
          accessor: (row: SearchResult): string => row.status || 'NEW',
        },
        {
          header: 'Domain Registration Date',
          field: 'domainRegisteredAt',
          accessor: (row: SearchResult): string => {
            return row.domainRegisteredAt?.toISOString() || ''
          },
        },
        {
          header: 'Description',
          field: 'description',
          accessor: (row: SearchResult): string => row.description || '',
        },
        {
          header: 'Enriched Status',
          field: 'enrichedStatus',
          accessor: (row: SearchResult): string => row.enrichedStatus || '',
        },
      ]

      validateAllSearchResultFieldsHaveColumns(columns)

      validateAndExportToCsv<SearchResult>({
        data: exportData,
        filename: 'places.csv',
        schema: PlaceSchema,
        columns,
      })

      posthog.capture('data_export_success', {
        user_id: user?.id,
        email: user?.primaryEmailAddress?.emailAddress,
        name: `${user?.firstName} ${user?.lastName}`.trim(),
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
      {isExporting ? 'Exporting...' : `Export to CSV (${selectedRows.length})`}
    </Button>
  )
})
