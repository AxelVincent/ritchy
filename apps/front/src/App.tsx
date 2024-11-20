import './App.css'
import { ClerkProvider } from '@clerk/clerk-react'
import { RouterProvider } from '@tanstack/react-router'
import { QueryProvider } from './providers/query-provider'
import { router } from './routes'

export const App = () => {
  return (
    <QueryProvider>
      <ClerkProvider
        publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      >
        <RouterProvider router={router} />
      </ClerkProvider>
    </QueryProvider>
  )
}

export default App
