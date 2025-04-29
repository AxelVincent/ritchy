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
      if (searchId) {
        await queryClient.cancelQueries({
          queryKey: searchContentKeys.search(searchId),
        })
      }
      if (listId) {
        await queryClient.cancelQueries({
          queryKey: listContentKeys.list(listId),
        })
      }

      // Snapshot previous values
      const previousNotes = queryClient.getQueryData<Note[]>([
        'notes',
        'place',
        placeId,
      ])
      const previousSearch = searchId
        ? queryClient.getQueryData<GetSearchContentResponse>(
            searchContentKeys.search(searchId),
          )
        : undefined
      const previousList = listId
        ? queryClient.getQueryData<GetListContentResponse>(
            listContentKeys.list(listId),
          )
        : undefined

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

      // Update search results if applicable
      if (previousSearch && searchId) {
        queryClient.setQueryData(
          searchContentKeys.search(searchId),
          (oldData: GetSearchContentResponse) => {
            return oldData.map((place) => {
              if (place.id === placeId) {
                return {
                  ...place,
                  notes: [optimisticNote, ...(place.notes || [])],
                }
              }
              return place
            })
          },
        )
      }

      // Update list content if applicable
      if (previousList && listId) {
        queryClient.setQueryData(
          listContentKeys.list(listId),
          (oldData: GetListContentResponse) => {
            return {
              ...oldData,
              items: oldData.items.map((place) => {
                if (place.id === placeId) {
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

      return { previousNotes, previousSearch, previousList, searchId, listId }
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
          ['notes', 'place', variables.placeId],
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
    onSuccess: (_, { placeId }) => {
      // Invalidate the notes query to get the real server data
      queryClient.invalidateQueries({
        queryKey: ['notes', 'place', placeId],
        exact: true,
      })
    },
  })
}
