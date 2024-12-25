import { useQuery } from '@tanstack/react-query'

interface CustomList {
  id: string
  name: string
  emoji: string
  itemCount: number
}

// Mock data with emojis
const MOCK_LISTS: CustomList[] = [
  { id: '1', name: 'Restaurants', emoji: '🍔', itemCount: 12 },
  { id: '2', name: 'Cafés', emoji: '☕', itemCount: 8 },
  { id: '3', name: 'Parcs', emoji: '🌳', itemCount: 5 },
  { id: '4', name: 'Musées', emoji: '🏛️', itemCount: 7 },
  { id: '5', name: 'Librairies', emoji: '📚', itemCount: 4 },
  { id: '6', name: 'Cinémas', emoji: '🎬', itemCount: 3 },
  { id: '7', name: 'Boutiques', emoji: '🛍️', itemCount: 15 },
  { id: '8', name: 'Sports', emoji: '⚽', itemCount: 6 },
  { id: '9', name: 'Bars', emoji: '🍺', itemCount: 9 },
  { id: '10', name: "Galeries d'art", emoji: '🎨', itemCount: 4 },
  { id: '11', name: 'Marchés', emoji: '🏪', itemCount: 7 },
  { id: '12', name: 'Points de vue', emoji: '🌅', itemCount: 5 },
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
