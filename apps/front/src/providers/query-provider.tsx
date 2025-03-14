import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Number.POSITIVE_INFINITY, // Data never becomes stale
      gcTime: 2 * 60 * 60 * 1000, // Keep unused data in cache for 2 hours
      retry: 1,
      placeholderData: (previousData: unknown) => previousData,
    },
  },
})

export const QueryProvider = ({ children }: PropsWithChildren) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
