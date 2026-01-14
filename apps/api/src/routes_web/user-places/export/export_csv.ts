import { logger } from '@ritchy/logger'
import { and, eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../../../db/db'
import { list, search } from '../../../db/schema'
import { getAggregatedUserPlaces } from '../../../services/places/queries/get_aggregated_user_places'
import { handleCacheMisses } from '../../../services/places/utils/handle-cache-misses'
import { populateSearchPlacesIfEmpty } from '../../../services/searches/populate-search-places'
import type { Place } from '../../../shared'
import { extractFilterParams } from '../../../utils/filters/query-schema'
import { ExportUserPlacesQuerySchema } from './contract'

// Helper to safely format date values (handles Date objects and strings)
const formatDate = (value: Date | string | null | undefined): string => {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString()
  // If it's a string, return as-is or try to parse
  return String(value)
}

// CSV column definitions
const CSV_COLUMNS: Array<{
  header: string
  accessor: (row: Place) => string
}> = [
  { header: 'ID', accessor: (row) => row.id },
  { header: 'Name', accessor: (row) => row.name },
  { header: 'Website', accessor: (row) => row.website || '' },
  {
    header: 'Short Description',
    accessor: (row) => row.shortDescription || '',
  },
  {
    header: 'Workforce Range',
    accessor: (row) => row.companyWorkforceRange || '',
  },
  {
    header: 'Date of Creation',
    accessor: (row) => formatDate(row.companyDateOfCreation),
  },
  {
    header: 'Activities',
    accessor: (row) =>
      row.companyActivities.map((activity) => activity.name).join(', '),
  },
  {
    header: 'Contacts',
    accessor: (row) =>
      row.placeContacts
        .map(
          (contact) =>
            `${contact.firstName} ${contact.lastName} - ${contact.role}`,
        )
        .join(', '),
  },
  {
    header: 'Technologies',
    accessor: (row) => row.companyTechnologies?.join(', ') || '',
  },
  { header: 'Primary Category', accessor: (row) => row.primaryType || '' },
  { header: 'Categories', accessor: (row) => row.types.join(', ') },
  { header: 'Phone', accessor: (row) => row.phone || '' },
  {
    header: 'Phones',
    accessor: (row) => (row.contactPhones || []).map((p) => p.phone).join(', '),
  },
  {
    header: 'Emails',
    accessor: (row) => row.contactEmails?.map((e) => e.email).join(', ') || '',
  },
  {
    header: 'LinkedIn Socials',
    accessor: (row) => row.contactLinkedins?.map((s) => s.url).join(', ') || '',
  },
  {
    header: 'Facebook Socials',
    accessor: (row) => row.contactFacebooks?.map((s) => s.url).join(', ') || '',
  },
  {
    header: 'Instagram Socials',
    accessor: (row) =>
      row.contactInstagrams?.map((s) => s.url).join(', ') || '',
  },
  { header: 'Rating', accessor: (row) => row.rating?.toString() || '' },
  {
    header: 'Number of Reviews',
    accessor: (row) => row.ratingCount?.toString() || '',
  },
  {
    header: 'Price Level',
    accessor: (row) => row.priceLevel?.toString() || '',
  },
  {
    header: 'Price Range',
    accessor: (row) => {
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
    accessor: (row) => row.address.formattedAddress || '',
  },
  {
    header: 'Short Address',
    accessor: (row) => row.address.shortFormattedAddress || '',
  },
  { header: 'Country', accessor: (row) => row.address.country || '' },
  { header: 'Locality', accessor: (row) => row.address.locality || '' },
  { header: 'Sublocality', accessor: (row) => row.address.sublocality || '' },
  { header: 'Postal Code', accessor: (row) => row.address.postalCode || '' },
  {
    header: 'Postal Code Suffix',
    accessor: (row) => row.address.postalCodeSuffix || '',
  },
  { header: 'Plus Code', accessor: (row) => row.address.plusCode || '' },
  { header: 'Street', accessor: (row) => row.address.street || '' },
  {
    header: 'Street Number',
    accessor: (row) => row.address.streetNumber || '',
  },
  { header: 'Neighborhood', accessor: (row) => row.address.neighborhood || '' },
  {
    header: 'Administrative Area Level 1',
    accessor: (row) => row.address.administrativeAreaLevel1 || '',
  },
  {
    header: 'Administrative Area Level 2',
    accessor: (row) => row.address.administrativeAreaLevel2 || '',
  },
  {
    header: 'Administrative Area Level 3',
    accessor: (row) => row.address.administrativeAreaLevel3 || '',
  },
  {
    header: 'Opening Hours',
    accessor: (row) => {
      const hours = row.openingHours
      if (!hours) return ''

      if (hours.weekdayDescriptions?.length) {
        return hours.weekdayDescriptions.join(' | ')
      }

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

      if (typeof hours.openNow === 'boolean') {
        return hours.openNow ? 'Currently Open' : 'Currently Closed'
      }

      return ''
    },
  },
  {
    header: 'Latitude',
    accessor: (row) => row.location?.latitude?.toString() || '',
  },
  {
    header: 'Longitude',
    accessor: (row) => row.location?.longitude?.toString() || '',
  },
  { header: 'Source', accessor: (row) => row.source },
  { header: 'Source URL', accessor: (row) => row.sourceUrl || '' },
  {
    header: 'Lists',
    accessor: (row) =>
      row.lists?.map((list) => `${list.emoji} ${list.name}`).join(' | ') || '',
  },
  { header: 'Status', accessor: (row) => row.status || 'NEW' },
  {
    header: 'Domain Registration Date',
    accessor: (row) => formatDate(row.domainRegisteredAt),
  },
  { header: 'Enriched Status', accessor: (row) => row.enrichedStatus || '' },
]

/**
 * Escape a CSV field value
 */
const escapeCSVField = (value: string): string => {
  // Excel requires double quotes around fields, and any double quotes
  // within the field must be escaped by doubling them
  return `"${value.replace(/"/g, '""')}"`
}

/**
 * Generate CSV content from places data
 */
const generateCSV = (items: Place[]): string => {
  const rows = [
    // Header row
    CSV_COLUMNS.map((col) => escapeCSVField(col.header)).join(';'),
    // Data rows
    ...items.map((row) =>
      CSV_COLUMNS.map((col) => {
        const value = col.accessor(row)
        return escapeCSVField(value)
      }).join(';'),
    ),
  ]

  // Join rows with Windows-style line endings for better Excel compatibility
  return rows.join('\r\n')
}

export const exportUserPlaces = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = req.auth.userId

  logger.info({
    msg: 'Export user places',
    event: 'export_user_places',
    metadata: {
      userId,
      query: req.query,
    },
  })

  try {
    // Parse query parameters using local schema
    const queryResult = ExportUserPlacesQuerySchema.safeParse(req.query)
    if (!queryResult.success) {
      logger.info({
        msg: 'Invalid query parameters',
        event: 'invalid_query_params',
        metadata: { errors: queryResult.error.errors },
      })
      res.status(400).json({
        error: 'Invalid query parameters',
        message: 'Invalid query parameters',
        details: queryResult.error.errors,
      })
      return
    }

    const query = queryResult.data
    const { listId, searchId } = query

    // Verify ownership if scoped to list
    if (listId) {
      const listResult = await db
        .select()
        .from(list)
        .where(and(eq(list.id, listId), eq(list.userId, userId)))
        .limit(1)

      if (!listResult.length) {
        res.status(404).json({ error: 'List not found' })
        return
      }
    }

    // Verify ownership if scoped to search
    if (searchId) {
      const searchResult = await db
        .select()
        .from(search)
        .where(and(eq(search.id, searchId), eq(search.userId, userId)))
        .limit(1)

      if (!searchResult.length) {
        res.status(404).json({ error: 'Search not found' })
        return
      }

      // Populate search places if empty
      await populateSearchPlacesIfEmpty(searchId, userId, {
        model: searchResult[0].model,
        keyword: searchResult[0].keyword,
        rectangle: searchResult[0].rectangle,
      })
    }

    // Extract filter params
    const filters = extractFilterParams(query)

    // Get ALL matching results (no pagination)
    const { items } = await getAggregatedUserPlaces({
      userId,
      listId,
      searchId,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      // No pagination - fetch all
    })

    // Handle cache misses
    const hadCacheMisses = await handleCacheMisses(items, {
      userId,
      listId,
      searchId,
    })

    let finalItems = items

    if (hadCacheMisses) {
      // Re-fetch after refresh
      const refreshedResult = await getAggregatedUserPlaces({
        userId,
        listId,
        searchId,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      })
      finalItems = refreshedResult.items
    }

    // Generate CSV
    const csv = generateCSV(finalItems)

    // Add UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF'
    const csvWithBOM = BOM + csv

    // Set response headers for file download
    const filename = `places_export_${new Date().toISOString().split('T')[0]}.csv`
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', Buffer.byteLength(csvWithBOM, 'utf-8'))

    logger.info({
      msg: 'Export completed',
      event: 'export_completed',
      metadata: {
        userId,
        itemCount: finalItems.length,
        filename,
      },
    })

    res.send(csvWithBOM)
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info({
        msg: 'Validation error',
        event: 'validation_error',
        metadata: { error },
      })
      res.status(400).json({
        error: 'Invalid request data',
        message: 'Invalid request data',
        details: error.errors,
      })
      return
    }

    // Properly serialize error for logging
    const errorDetails =
      error instanceof Error
        ? { message: error.message, stack: error.stack, name: error.name }
        : { raw: String(error) }

    logger.error({
      msg: 'Export user places error',
      event: 'export_user_places_error',
      metadata: { error: errorDetails },
    })
    res.status(500).json({
      error: 'Failed to export user places',
      message:
        error instanceof Error ? error.message : 'Failed to export user places',
    })
  }
}
