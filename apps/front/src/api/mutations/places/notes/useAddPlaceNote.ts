import { listContentKeys } from '@/api/queries/lists/useListContent'
import { searchContentKeys } from '@/api/queries/search/useSearchContent'
import { useApiMutation } from '@/hooks/useApi'
import type {
  AddNoteApiResponse,
  AddNoteRequest,
  GetListContentResponse,
  GetSearchContentResponse,
  Note,
} from '@ritchy/types'
import { useQueryClient } from '@tanstack/react-query'

export const useAddPlaceNote = () => {
  const queryClient = useQueryClient()

  return useApiMutation<
    AddNoteApiResponse,
    AddNoteRequest & { listId: string | null }
  >('/places/:userPlaceId/notes', {
    getEndpoint: ({ userPlaceId }) => `/places/${userPlaceId}/notes`,
    getBody: ({ note }) => ({ note }),
    onMutate: async ({ userPlaceId, note, listId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['notes', 'place', userPlaceId],
        exact: true,
      })
      if (listId) {
        await queryClient.cancelQueries({
          queryKey: listContentKeys.list(listId),
        })
      }

      // Snapshot previous values
      const previousNotes = queryClient.getQueryData<Note[]>([
        'notes',
        'place',
        userPlaceId,
      ])
      const previousList = listId
        ? queryClient.getQueryData<GetListContentResponse>(
            listContentKeys.list(listId),
          )
        : undefined

      // Create optimistic note
      const optimisticNote: Note = {
        id: `temp-${Date.now()}`,
        userPlaceId,
        note,
        userId: 'current-user',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Update notes query
      queryClient.setQueryData<Note[]>(
        ['notes', 'place', userPlaceId],
        (old = []) => [optimisticNote, ...old],
      )

      // Update list content if applicable
      if (previousList && listId) {
        queryClient.setQueryData(
          listContentKeys.list(listId),
          (oldData: GetListContentResponse) => {
            return {
              ...oldData,
              items: oldData.items.map((place) => {
                if (place.id === userPlaceId) {
                  return {
                    ...place,
                    notes: [optimisticNote, ...(place.notes || [])],
                  }
                }
                return place
              }),
            }
          },
        )
      }

      return { previousNotes, previousList, listId }
    },
    onError: (_, variables, context: unknown) => {
      const typedContext = context as {
        previousNotes?: Note[]
        previousSearch?: GetSearchContentResponse
        previousList?: GetListContentResponse
        searchId?: string
        listId?: string
      }

      // Rollback all optimistic updates on error
      if (typedContext.previousNotes) {
        queryClient.setQueryData(
          ['notes', 'place', variables.userPlaceId],
          typedContext.previousNotes,
        )
      }
      if (typedContext.searchId) {
        queryClient.setQueryData(
          searchContentKeys.search(typedContext.searchId),
          typedContext.previousSearch,
        )
      }
      if (typedContext.listId) {
        queryClient.setQueryData(
          listContentKeys.list(typedContext.listId),
          typedContext.previousList,
        )
      }
    },
    onSuccess: (_, { userPlaceId }) => {
      // Invalidate the notes query to get the real server data
      queryClient.invalidateQueries({
        queryKey: ['notes', 'place', userPlaceId],
        exact: true,
      })
    },
  })
}
