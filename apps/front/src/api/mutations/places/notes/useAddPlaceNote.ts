import { placesKeys } from '@/api/queries/places/usePlaces'
import { useApiMutation } from '@/hooks/useApi'
import type {
  AddNoteApiResponse,
  AddNoteRequest,
  Note,
  Place,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const useAddPlaceNote = () => {
  const queryClient = useQueryClient()

  return useApiMutation<
    AddNoteApiResponse,
    AddNoteRequest & { searchId: string | null; listId: string | null }
  >('/places/:placeId/notes', {
    getEndpoint: ({ placeId }) => `/places/${placeId}/notes`,
    getBody: ({ note }) => ({ note }),
    onMutate: async ({ placeId, note, searchId, listId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['notes', 'place', placeId],
        exact: true,
      })

      // Determine which ID to use based on current view
      const currentId = listId || searchId
      const idType = listId ? 'listId' : 'searchId'
      const filters = { [idType]: currentId }
      const queryKey = [...placesKeys.all, 'filters', JSON.stringify(filters)]

      await queryClient.cancelQueries({ queryKey })

      // Snapshot previous values
      const previousNotes = queryClient.getQueryData<Note[]>([
        'notes',
        'place',
        placeId,
      ])
      const previousPlaces = queryClient.getQueryData<Place[]>(queryKey)

      // Create optimistic note
      const optimisticNote: Note = {
        id: `temp-${Date.now()}`,
        placeId,
        note,
        userId: 'current-user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Update notes query
      queryClient.setQueryData<Note[]>(
        ['notes', 'place', placeId],
        (old = []) => [optimisticNote, ...old],
      )

      // Update places data
      if (previousPlaces) {
        queryClient.setQueryData<Place[]>(queryKey, (oldData = []) => {
          return oldData.map((place) => {
            if (place.id === placeId) {
              return {
                ...place,
                notes: [optimisticNote, ...(place.notes || [])],
              }
            }
            return place
          })
        })
      }

      return { previousNotes, previousPlaces, queryKey }
    },
    onError: (_, variables, context: unknown) => {
      const typedContext = context as {
        previousNotes?: Note[]
        previousPlaces?: Place[]
        queryKey: readonly unknown[]
      }

      // Rollback all optimistic updates on error
      if (typedContext.previousNotes) {
        queryClient.setQueryData(
          ['notes', 'place', variables.placeId],
          typedContext.previousNotes,
        )
      }
      if (typedContext.previousPlaces) {
        queryClient.setQueryData(
          typedContext.queryKey,
          typedContext.previousPlaces,
        )
      }
    },
    onSuccess: (_, { placeId }) => {
      // Invalidate the notes query to get the real server data
      queryClient.invalidateQueries({
        queryKey: ['notes', 'place', placeId],
        exact: true,
      })
    },
  })
}
