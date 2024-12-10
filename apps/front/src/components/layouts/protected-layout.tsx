import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react'
import { Navigate, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { ThemeToggle } from '../theme-toggle'

export const ProtectedLayout = () => {
  useEffect(() => {
    // Initialize Sleekplan
    window.$sleek = []
    window.SLEEK_PRODUCT_ID = 26548954

    const script = document.createElement('script')
    script.src = 'https://client.sleekplan.com/sdk/e.js'
    script.async = true
    document.head.appendChild(script)

    return () => {
      // Cleanup on unmount
      document.head.removeChild(script)
      // biome-ignore lint/performance/noDelete: temporary for sleekplan script
      delete window.$sleek
      // biome-ignore lint/performance/noDelete: temporary for sleekplan script
      delete window.SLEEK_PRODUCT_ID
    }
  }, [])

  return (
    <>
      <SignedIn>
        <main>
          <div className="flex flex-row w-screen h-screen">
            <div className="w-[5%] flex flex-col items-center justify-start gap-4 pt-4">
              <UserButton />
              <ThemeToggle />
            </div>
            <div className="w-[95%] h-full">
              <Outlet />
            </div>
          </div>
        </main>
      </SignedIn>

      <SignedOut>
        <Navigate to="/" />
      </SignedOut>
    </>
  )
}
