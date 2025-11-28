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

export function validateAndExportToCsv({
  data,
  filename = 'export.csv',
  columns,
  schema,
}: ExportOptions<SearchResult>) {
  // Validate all data
  const validatedData = data.map((item) =>
    schema.parse({
      ...item,
      contactEmails: item.contactEmails ?? [],
      contactLinkedins: item.contactLinkedins ?? [],
      contactFacebooks: item.contactFacebooks ?? [],
      contactInstagrams: item.contactInstagrams ?? [],
    }),
  ) as SearchResult[]

  // If no columns provided, use default object keys
  const effectiveColumns =
    columns ||
    Object.keys(validatedData[0] as Record<string, unknown>).map((key) => ({
      header: key,
      accessor: (row: SearchResult) => row[key as keyof SearchResult],
    }))

  // Generate CSV content
  const csvRows = [
    // Create header row
    effectiveColumns
      .map((col) => `"${col.header.replace(/"/g, '""')}"`)
      .join(';'),

    // Create data rows
    ...validatedData.map((row) =>
      effectiveColumns
        .map((col) => {
          // Get the value
          const rawValue = col.accessor(row)

          // Handle different value types
          let value: string

          if (rawValue === null || rawValue === undefined) {
            value = ''
          } else if (rawValue instanceof Date) {
            value = rawValue.toISOString()
          } else if (typeof rawValue === 'object') {
            // For objects (like arrays or nested objects), stringify them
            // but in a more Excel-friendly format
            try {
              if (Array.isArray(rawValue)) {
                // Join arrays with semicolons instead of commas for Excel compatibility
                value = rawValue.join('; ')
              } else {
                // For objects, create a simplified string representation
                value = JSON.stringify(rawValue)
                  .replace(/[{}"[\]]/g, '')
                  .replace(/,/g, '; ')
                  .replace(/:/g, ': ')
              }
            } catch {
              value = String(rawValue)
            }
          } else {
            // Convert to string and handle special cases
            value = String(rawValue)
          }

          // Excel requires double quotes around fields, and any double quotes
          // within the field must be escaped by doubling them
          return `"${value.replace(/"/g, '""')}"`
        })
        .join(';'),
    ),
  ]

  // Join rows with Windows-style line endings for better Excel compatibility
  const csvContent = csvRows.join('\r\n')

  // Add UTF-8 BOM for Excel compatibility
  // This is crucial for special characters like accented letters
  const BOM = '\uFEFF'
  const csvWithBOM = BOM + csvContent

  // Create and trigger file download with explicit UTF-8 encoding
  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
