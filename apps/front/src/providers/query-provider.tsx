import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Data becomes stale after 5 minutes (or adjust as needed)
      gcTime: 2 * 60 * 60 * 1000, // Keep unused data in cache for 2 hours
      retry: 1,
    },
  },
})

export const QueryProvider = ({ children }: PropsWithChildren) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
