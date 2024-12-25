import { useQuery } from '@tanstack/react-query'

interface CustomListContent {
  placeIds: string[]
}

// Mock data
const MOCK_LIST_CONTENTS: Record<string, CustomListContent> = {
  '1': {
    placeIds: Array(12)
      .fill(0)
      .map(
        () => `ChIJ${Math.random().toString(36).substr(2, 8)}EmsRUsoyG83frY4`,
      ),
  },
  '2': {
    placeIds: Array(8)
      .fill(0)
      .map(
        () => `ChIJ${Math.random().toString(36).substr(2, 8)}EmsRUKgyFmh9AQM`,
      ),
  },
  '3': {
    placeIds: Array(5)
      .fill(0)
      .map(
        () => `ChIJ${Math.random().toString(36).substr(2, 8)}EmsRBfy61i59si0`,
      ),
  },
  '4': {
    placeIds: Array(7)
      .fill(0)
      .map(
        () => `ChIJ${Math.random().toString(36).substr(2, 8)}EmsRwMwyFmh9AQM`,
      ),
  },
  '5': {
    placeIds: Array(4)
      .fill(0)
      .map(
        () => `ChIJ${Math.random().toString(36).substr(2, 8)}EmsRxM6vFmh9AQM`,
      ),
  },
  '6': {
    placeIds: Array(3)
      .fill(0)
      .map(
        () => `ChIJ${Math.random().toString(36).substr(2, 8)}EmsR8MwyFmh9AQM`,
      ),
  },
  '7': {
    placeIds: Array(15)
      .fill(0)
      .map(
        () => `ChIJ${Math.random().toString(36).substr(2, 8)}EmsRkMwyFmh9AQM`,
      ),
  },
  '8': {
    placeIds: Array(6)
      .fill(0)
      .map(
        () => `ChIJ${Math.random().toString(36).substr(2, 8)}EmsReMJ5Uit6vX4`,
      ),
  },
  '9': {
    placeIds: Array(9)
      .fill(0)
      .map(
        () => `ChIJ${Math.random().toString(36).substr(2, 8)}EmsRsPwyFmh9AQM`,
      ),
  },
  '10': {
    placeIds: Array(4)
      .fill(0)
      .map(
        () => `ChIJ${Math.random().toString(36).substr(2, 8)}EmsReMJ5Uit6vX4`,
      ),
  },
  '11': {
    placeIds: Array(7)
      .fill(0)
      .map(
        () => `ChIJ${Math.random().toString(36).substr(2, 8)}EmsRkMwyFmh9AQM`,
      ),
  },
  '12': {
    placeIds: Array(5)
      .fill(0)
      .map(
        () => `ChIJ${Math.random().toString(36).substr(2, 8)}EmsRsPwyFmh9AQM`,
      ),
  },
}

export const useCustomListContentQuery = (listId: string) => {
  return useQuery({
    queryKey: ['customList', listId],
    queryFn: async () => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Simulate not found case
      if (!MOCK_LIST_CONTENTS[listId]) {
        throw new Error('List not found')
      }

      return MOCK_LIST_CONTENTS[listId]
    },
  })
}
