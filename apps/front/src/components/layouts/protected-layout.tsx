import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react'
import { Navigate, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'

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
          <div className="flex flex-row w-full h-full">
            <div className="flex-col justify-items-center p-1 justify-start w-10 bg-gray-50">
              <UserButton />
            </div>
            <Outlet />
          </div>
        </main>
      </SignedIn>

      <SignedOut>
        <Navigate to="/" />
      </SignedOut>
    </>
  )
}
