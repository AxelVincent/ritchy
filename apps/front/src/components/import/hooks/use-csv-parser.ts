import Papa from 'papaparse'
import type { CsvRow } from '../import'

const MAX_ROWS = 1000

export const useCsvParser = () => {
  const parseFile = async (
    file: File,
  ): Promise<{
    headers: string[]
    dataRows: string[][]
    error?: string
  }> => {
    return new Promise((resolve) => {
      Papa.parse<string[]>(file, {
        complete: (results) => {
          // Filter out empty rows
          const filteredRows = results.data.filter((row) =>
            row.some((cell) => cell?.trim()),
          )

          if (filteredRows.length === 0) {
            resolve({
              headers: [],
              dataRows: [],
              error: 'CSV file is empty',
            })
            return
          }

          if (filteredRows.length > MAX_ROWS + 1) {
            // +1 for header
            resolve({
              headers: [],
              dataRows: [],
              error: `CSV file exceeds maximum of ${MAX_ROWS} data rows. Found ${filteredRows.length - 1} rows.`,
            })
            return
          }

          // First row is headers
          const headers = filteredRows[0].map((h) => h?.trim() || '')
          const dataRows = filteredRows.slice(1)

          resolve({ headers, dataRows })
        },
        error: (error) => {
          resolve({
            headers: [],
            dataRows: [],
            error: `Failed to parse CSV: ${error.message}`,
          })
        },
        skipEmptyLines: true,
      })
    })
  }

  const mapRowsToImportFormat = (
    dataRows: string[][],
    headers: string[],
    nameColumnName?: string,
    placeIdColumnName?: string,
  ): CsvRow[] => {
    const nameColumnIndex = nameColumnName
      ? headers.indexOf(nameColumnName)
      : -1
    const placeIdColumnIndex = placeIdColumnName
      ? headers.indexOf(placeIdColumnName)
      : -1

    return dataRows.map((row, index) => ({
      rowIndex: index,
      placeName:
        nameColumnIndex >= 0 ? row[nameColumnIndex]?.trim() : undefined,
      placeId:
        placeIdColumnIndex >= 0 ? row[placeIdColumnIndex]?.trim() : undefined,
      status: 'pending' as const,
    }))
  }

  return { parseFile, mapRowsToImportFormat }
}
