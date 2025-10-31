import type { AutocompletePrediction } from '@ritchy/types'

export type RowStatus =
  | 'pending' // Not yet processed
  | 'processing' // Currently calling API
  | 'success' // Added to list
  | 'ambiguous' // Multiple autocomplete results
  | 'failed' // API error or zero results
  | 'skipped' // User chose to skip
  | 'duplicate' // Already in user's collection

export type CsvRow = {
  rowIndex: number
  placeName?: string
  placeId?: string
  status: RowStatus
  error?: string
  userPlaceId?: string // Returned from API
  predictions?: AutocompletePrediction[] // For ambiguous
  selectedPlaceId?: string // User's choice from ambiguous
}

export type ImportStep =
  | 'upload' // Select CSV file
  | 'preview' // Show parsed rows, select columns
  | 'validate_credits' // Check if enough credits
  | 'processing' // Row-by-row processing
  | 'summary' // Show final results

export type ColumnMapping = {
  nameColumn?: string
  placeIdColumn?: string
}

export type ImportStats = {
  total: number
  processed: number
  successful: number
  failed: number
  ambiguous: number
  skipped: number
  duplicate: number
}

export type ImportState = {
  step: ImportStep
  file: File | null
  rows: CsvRow[]
  columnMapping: ColumnMapping
  listId?: string
  listName: string
  listEmoji: string
  stats: ImportStats
  isPaused: boolean
  error?: string
}
