import type { SearchResult } from '@ritchy/types'
import type { z } from 'zod'

interface ExportOptions<T> {
  data: T[]
  filename?: string
  columns?: {
    header: string
    accessor: (row: T) => string | number
  }[]
  schema: z.ZodSchema
}

export function validateAndExportToCsv<T>({
  data,
  filename = 'export.csv',
  columns,
  schema,
}: ExportOptions<SearchResult>) {
  // Validate all data
  const validatedData = data.map((item) =>
    schema.parse({
      ...item,
      enrichment: {
        ...item.enrichment,
        id: item.id,
        emails: item.enrichment?.emails ?? [],
        socialLinks: item.enrichment?.socialLinks ?? {},
      },
    }),
  )

  // If no columns provided, use default object keys
  const effectiveColumns =
    columns ||
    Object.keys(validatedData[0]).map((key) => ({
      header: key,
      accessor: (row: T) => row[key as keyof T],
    }))

  // Generate CSV content
  const csvContent = [
    // Create header row
    effectiveColumns
      .map((col) => col.header)
      .join(','),

    // Create data rows
    ...validatedData.map((row) =>
      effectiveColumns
        .map((col) => {
          // Get the value and convert to string
          const rawValue = col.accessor(row)

          // Handle different value types
          const value =
            rawValue instanceof Date ? rawValue.toISOString() : rawValue

          // Escape special characters
          return `"${String(value).replace(/"/g, '""')}"`
        })
        .join(','),
    ),
  ].join('\n')

  // Create and trigger file download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
