import './App.css'
import { Toaster } from '@/components/ui/toaster'
import { ClerkProvider, useUser } from '@clerk/clerk-react'
import { RouterProvider } from '@tanstack/react-router'
import { QueryProvider } from './providers/query-provider'
import { ThemeProvider } from './providers/theme-provider'
import { createRouter } from './router'

const router = createRouter()
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function InnerApp() {
  const { isSignedIn, user } = useUser()
  return (
    <RouterProvider
      router={router}
      context={{
        auth: { isSignedIn, user },
      }}
    />
  )
}

export const App = () => {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <QueryProvider>
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
          <InnerApp />
          <Toaster />
        </ThemeProvider>
      </QueryProvider>
    </ClerkProvider>
  )
}

export default App
