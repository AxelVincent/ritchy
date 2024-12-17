import { useQuery } from '@tanstack/react-query'

interface CustomList {
  id: string
  name: string
  emoji: string
  itemCount: number
}

// Mock data with emojis
const MOCK_LISTS: CustomList[] = [
  { id: '1', name: 'Favorite Places', emoji: '⭐', itemCount: 3 },
  { id: '2', name: 'To Visit', emoji: '🎯', itemCount: 5 },
  { id: '3', name: 'Recommended', emoji: '👍', itemCount: 2 },
]

export const useCustomListsQuery = () => {
  return useQuery({
    queryKey: ['customLists'],
    queryFn: async () => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500))
      return MOCK_LISTS
    },
  })
}
