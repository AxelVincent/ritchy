import { listContentKeys } from '@/api/queries/lists/useListContent'
import { placeKeys } from '@/api/queries/places/usePlace'
import { searchContentKeys } from '@/api/queries/search/useSearchContent'
import { useApiMutation, webApiClient } from '@/hooks/useApi'
import { useAuth } from '@clerk/clerk-react'
import type {
  DeleteNoteApiResponse,
  DeleteNoteRequest,
  GetListContentApiResponse,
  GetPlaceApiResponse,
  GetSearchContentApiResponse,
  Note,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const useDeletePlaceNote = () => {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()

  return useApiMutation<
    DeleteNoteApiResponse,
    DeleteNoteRequest & { userPlaceId: string }
  >('/places/:userPlaceId/notes/:noteId', {
    getEndpoint: ({ userPlaceId, noteId }) =>
      `/places/${userPlaceId}/notes/${noteId}`,
    method: 'DELETE',
    onMutate: async ({ userPlaceId, noteId }) => {
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

      // Update notes query optimistically by removing the note
      queryClient.setQueryData<Note[]>(
        ['notes', 'place', userPlaceId],
        (old = []) => old.filter((n) => n.id !== noteId),
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
          '[useDeletePlaceNote] Failed to update optimistically:',
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
