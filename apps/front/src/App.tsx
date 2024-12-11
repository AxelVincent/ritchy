import './App.css'
import { Toaster } from '@/components/ui/toaster'
import { ClerkProvider } from '@clerk/clerk-react'
import { RouterProvider } from '@tanstack/react-router'
import { QueryProvider } from './providers/query-provider'
import { ThemeProvider } from './providers/theme-provider'
import { router } from './routes'

export const App = () => {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <QueryProvider>
        <ClerkProvider
          publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
        >
          <RouterProvider router={router} />
        </ClerkProvider>
      </QueryProvider>
      <Toaster />
    </ThemeProvider>
  )
}

export default App
