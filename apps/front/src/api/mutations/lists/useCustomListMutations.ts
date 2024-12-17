import { useMutation, useQueryClient } from '@tanstack/react-query'

let mockListId = 4 // For generating new list IDs

// Default emojis to choose from
export const DEFAULT_EMOJIS = [
  '📍',
  '🎯',
  '⭐',
  '💫',
  '🌟',
  '✨',
  '💡',
  '📌',
  '🎪',
  '🏰',
  '🗺️',
  '🌍',
]

export const useCustomListMutations = () => {
  const queryClient = useQueryClient()

  const addList = useMutation({
    mutationFn: async ({ name, emoji }: { name: string; emoji: string }) => {
      // Simulate API delay
      console.log('Adding list:', { name, emoji })
      await new Promise((resolve) => setTimeout(resolve, 500))
      return { id: String(mockListId++) }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customLists'] })
    },
  })

  const addItemsToList = useMutation({
    mutationFn: async ({
      listId,
      items,
    }: {
      listId: string
      items: unknown[]
    }) => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500))
      console.log(`Added ${items.length} items to list ${listId}:`, items)
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customLists'] })
    },
  })

  return {
    addList,
    addItemsToList,
  }
}
