import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { Navigate, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { SidebarInset, SidebarProvider } from '../ui/sidebar'
import { AppSidebar } from './sidebar/app-sidebar'

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
        <SidebarProvider open={false}>
          <AppSidebar />
          <SidebarInset>
            <Outlet />
          </SidebarInset>
        </SidebarProvider>
      </SignedIn>

      <SignedOut>
        <Navigate to="/" />
      </SignedOut>
    </>
  )
}
