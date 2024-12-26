import { useMutation, useQueryClient } from '@tanstack/react-query'

export const useRemoveFromList = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      listId,
      items,
    }: {
      listId: string
      items: unknown[]
    }) => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500))
      console.log(`Removed ${items.length} items from list ${listId}:`, items)
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customLists'] })
    },
  })
}
