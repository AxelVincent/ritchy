import { ClerkProvider } from '@clerk/clerk-react'
import type { ReactNode } from 'react'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  if (!CLERK_PUBLISHABLE_KEY) {
    throw new Error('Missing Clerk Publishable Key')
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      {children}
    </ClerkProvider>
  )
}
