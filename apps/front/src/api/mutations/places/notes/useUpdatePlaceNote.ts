import { placeKeys } from '@/api/queries/places/usePlace'
import { userPlacesKeys } from '@/api/queries/user-places/useUserPlaces'
import { useApiMutation, webApiClient } from '@/hooks/useApi'
import type { GetPlaceApiResponse } from '@api/routes_web/places/get/contract'
import type {
  Note,
  UpdateNoteApiResponse,
  UpdateNoteBody,
  UpdateNoteParams,
} from '@api/routes_web/places/notes/update-note/contract'
import type { GetUserPlacesApiResponse } from '@api/routes_web/user-places/get/contract'
import { useAuth } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'

export const useUpdatePlaceNote = () => {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()

  return useApiMutation<
    UpdateNoteApiResponse,
    UpdateNoteBody & UpdateNoteParams
  >('/places/:userPlaceId/notes/:noteId', {
    getEndpoint: ({ userPlaceId, noteId }) =>
      `/places/${userPlaceId}/notes/${noteId}`,
    getBody: ({ note }) => ({ note }),
    method: 'PATCH',
    onMutate: async ({ userPlaceId, noteId, note }) => {
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

      // Update notes query optimistically
      queryClient.setQueryData<Note[]>(
        ['notes', 'place', userPlaceId],
        (old = []) =>
          old.map((n) =>
            n.id === noteId ? { ...n, note, updatedAt: new Date() } : n,
          ),
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

        // Update all user places queries (unified endpoint)
        queryClient.setQueriesData<GetUserPlacesApiResponse>(
          { queryKey: userPlacesKeys.all },
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

        // Invalidate notes query to get fresh data
        queryClient.invalidateQueries({
          queryKey: ['notes', 'place', userPlaceId],
          exact: true,
        })
      } catch (error) {
        console.error(
          '[useUpdatePlaceNote] Failed to update optimistically:',
          error,
        )
        // Fallback: invalidate queries
        queryClient.invalidateQueries({ queryKey: userPlacesKeys.all })
        queryClient.invalidateQueries({
          queryKey: ['notes', 'place', userPlaceId],
          exact: true,
        })
      }
    },
  })
}
