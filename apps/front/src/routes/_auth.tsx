import { AppSidebar } from '@/components/sidebar/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { useUser } from '@clerk/clerk-react'
import { Navigate, Outlet, createFileRoute } from '@tanstack/react-router'
import posthog from 'posthog-js'
import { useEffect } from 'react'

export const Route = createFileRoute('/_auth')({
  component: AuthedLayout,
})

function AuthedLayout() {
  const isMobile = window.innerWidth < 768

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

  if (isMobile) {
    return (
      <div className="flex items-center justify-center h-screen bg-background p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-foreground">
            Mobile not supported
          </h1>
          <p className="text-muted-foreground">
            This application is optimized for desktop and tablet use. Please
            access it from a larger screen device.
            <br />
            If you really need to use it on a mobile device, please make a
            feature request through the feedback button or this contact form
            <a href="https://www.ritchy.io/contact" className="underline">
              https://www.ritchy.io/contact
            </a>
            .
          </p>
          <p className="mt-4 italic">Your friends at Ritchy 🐕</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <SignedIn>
        <PostHogIdentify />
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="h-full w-full overflow-hidden">
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

// Add this new component to handle PostHog identification
function PostHogIdentify() {
  const { user } = useUser()

  useEffect(() => {
    if (user) {
      posthog.identify(
        user.id, // Use Clerk's user ID as the distinct_id
        {
          email: user.primaryEmailAddress?.emailAddress,
          name: `${user.firstName} ${user.lastName}`.trim(),
          // Add any other user properties you want to track
        },
      )
    }
  }, [user])

  return null
}
