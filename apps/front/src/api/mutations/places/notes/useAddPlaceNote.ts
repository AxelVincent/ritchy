import { listContentKeys } from '@/api/queries/lists/useListContent'
import { placeKeys } from '@/api/queries/places/usePlace'
import { searchContentKeys } from '@/api/queries/search/useSearchContent'
import { useApiMutation, webApiClient } from '@/hooks/useApi'
import { useAuth } from '@clerk/clerk-react'
import type {
  AddNoteApiResponse,
  AddNoteRequest,
  GetListContentApiResponse,
  GetPlaceApiResponse,
  GetSearchContentApiResponse,
  Note,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const useAddPlaceNote = () => {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()

  return useApiMutation<
    AddNoteApiResponse,
    AddNoteRequest & { listId: string | null }
  >('/places/:userPlaceId/notes', {
    getEndpoint: ({ userPlaceId }) => `/places/${userPlaceId}/notes`,
    getBody: ({ note }) => ({ note }),
    onMutate: async ({ userPlaceId, note }) => {
      // Cancel any outgoing refetches for notes
      await queryClient.cancelQueries({
        queryKey: ['notes', 'place', userPlaceId],
        exact: true,
      })

      // Snapshot previous notes
      const previousNotes = queryClient.getQueryData<Note[]>([
        'notes',
        'place',
        userPlaceId,
      ])

      // Create optimistic note
      const optimisticNote: Note = {
        id: `temp-${Date.now()}`,
        userPlaceId,
        note,
        userId: 'current-user',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Update notes query optimistically
      queryClient.setQueryData<Note[]>(
        ['notes', 'place', userPlaceId],
        (old = []) => [optimisticNote, ...old],
      )

      return { previousNotes }
    },
    onError: (_, variables, context: unknown) => {
      const typedContext = context as {
        previousNotes?: Note[]
      }

      // Rollback notes on error
      if (typedContext.previousNotes) {
        queryClient.setQueryData(
          ['notes', 'place', variables.userPlaceId],
          typedContext.previousNotes,
        )
      }
    },
    onSuccess: async (_, { userPlaceId }) => {
      try {
        // Fetch fresh place data with updated notes
        const token = await getToken()
        const placeData = await queryClient.fetchQuery<GetPlaceApiResponse>({
          queryKey: placeKeys.place(userPlaceId),
          queryFn: async () => {
            return webApiClient.fetchWithAuth<GetPlaceApiResponse>(
              `/places/${userPlaceId}`,
              { method: 'GET' },
              token,
            )
          },
          staleTime: 0,
        })

        if ('error' in placeData) {
          throw new Error('Failed to fetch updated place')
        }

        const updatedPlace = placeData.place

        // Update all list content queries
        queryClient.setQueriesData<GetListContentApiResponse>(
          { queryKey: listContentKeys.all },
          (oldData) => {
            if (!oldData || 'error' in oldData) return oldData

            const placeIndex = oldData.items.findIndex(
              (p) => p.id === userPlaceId,
            )
            if (placeIndex === -1) return oldData

            const newItems = [...oldData.items]
            newItems[placeIndex] = updatedPlace

            return {
              ...oldData,
              items: newItems,
            }
          },
        )

        // Update all search content queries
        queryClient.setQueriesData<GetSearchContentApiResponse>(
          { queryKey: searchContentKeys.all },
          (oldData) => {
            if (!oldData || 'error' in oldData) return oldData

            const placeIndex = oldData.findIndex((p) => p.id === userPlaceId)
            if (placeIndex === -1) return oldData

            const newPlaces = [...oldData]
            newPlaces[placeIndex] = updatedPlace

            return newPlaces
          },
        )

        // Invalidate notes query to get fresh data
        queryClient.invalidateQueries({
          queryKey: ['notes', 'place', userPlaceId],
          exact: true,
        })
      } catch (error) {
        console.error(
          '[useAddPlaceNote] Failed to update optimistically:',
          error,
        )
        // Fallback: invalidate queries
        queryClient.invalidateQueries({ queryKey: listContentKeys.all })
        queryClient.invalidateQueries({ queryKey: searchContentKeys.all })
        queryClient.invalidateQueries({
          queryKey: ['notes', 'place', userPlaceId],
          exact: true,
        })
      }
    },
  })
}
