import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
    },
  },
})

export const QueryProvider = ({ children }: PropsWithChildren) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
