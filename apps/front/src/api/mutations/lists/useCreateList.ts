import { useMutation, useQueryClient } from '@tanstack/react-query'

let mockListId = 4 // For generating new list IDs

export const useCreateList = () => {
  const queryClient = useQueryClient()

  return useMutation({
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
}
