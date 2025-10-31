import { useAddItemFromGeocode } from '@/api/mutations/lists/useAddItemFromGeocode'
import { usePlaceAutocomplete } from '@/api/mutations/places/autocomplete/usePlaceAutocomplete'
import type { CsvRow } from '../import'

type ProcessRowResult = {
  status: 'success' | 'failed' | 'ambiguous' | 'duplicate' | 'paused'
  error?: string
  predictions?: Array<{
    placeId: string
    text: string
    mainText: string
    secondaryText?: string
    types: string[]
  }>
}

export const useImportProcessor = () => {
  const autocompleteMutation = usePlaceAutocomplete()
  const addPlaceMutation = useAddItemFromGeocode()

  const generateSessionToken = (): string => {
    return crypto.randomUUID()
  }

  const processRow = async (
    row: CsvRow,
    listId: string,
  ): Promise<ProcessRowResult> => {
    const sessionToken = generateSessionToken()

    try {
      // Case 1: Place ID provided - skip autocomplete
      if (row.placeId) {
        const result = await addPlaceMutation.mutateAsync({
          googleMapsPlaceId: row.placeId,
          listId,
        })

        if ('success' in result && result.success) {
          return { status: 'success' }
        }

        return {
          status: 'failed',
          error: 'Failed to add place',
        }
      }

      // Case 2: Place name - need autocomplete
      if (row.placeName) {
        const autocompleteResult = await autocompleteMutation.mutateAsync({
          input: row.placeName,
          sessionToken,
        })

        if ('error' in autocompleteResult) {
          return {
            status: 'failed',
            error: autocompleteResult.message || 'Autocomplete failed',
          }
        }

        const { predictions } = autocompleteResult

        // No results found
        if (predictions.length === 0) {
          return {
            status: 'failed',
            error: 'No results found',
          }
        }

        // Unique result - auto-add
        if (predictions.length === 1) {
          const addResult = await addPlaceMutation.mutateAsync({
            googleMapsPlaceId: predictions[0].placeId,
            listId,
          })

          if ('success' in addResult && addResult.success) {
            return { status: 'success' }
          }

          return {
            status: 'failed',
            error: 'Failed to add place',
          }
        }

        // Multiple results - mark ambiguous
        return {
          status: 'ambiguous',
          predictions,
        }
      }

      return {
        status: 'failed',
        error: 'No place name or ID provided',
      }
    } catch (error: unknown) {
      // Check for specific error codes
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { status?: number } }).response

        if (response?.status === 403) {
          // Out of credits
          return {
            status: 'paused',
            error: 'Out of credits',
          }
        }

        if (response?.status === 409) {
          // Duplicate
          return { status: 'duplicate' }
        }

        if (response?.status === 429) {
          // Rate limit
          return {
            status: 'paused',
            error: 'Rate limit exceeded',
          }
        }
      }

      return {
        status: 'failed',
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  return { processRow }
}
