import {
  isSubscriptionSuccess,
  useUserSubscription,
} from '@/api/queries/users/useUserSubscription'
import { AppSidebar } from '@/components/sidebar/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useMediaQuery } from '@/hooks/use-media-query'
import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { useUser } from '@clerk/clerk-react'
import {
  Navigate,
  Outlet,
  createFileRoute,
  useNavigate,
} from '@tanstack/react-router'
import posthog from 'posthog-js'
import { useEffect } from 'react'

export const Route = createFileRoute('/_auth')({
  component: AuthedLayout,
})

function AuthedLayout() {
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
        <PostHogIdentify />
        <ClerkRedirect />
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

// Add this component to handle Clerk signup redirection
function ClerkRedirect() {
  const { user, isLoaded } = useUser()
  const navigate = useNavigate()
  const { data: subscriptionData, isLoading: isLoadingSubscription } =
    useUserSubscription()
  const userPlan =
    subscriptionData && isSubscriptionSuccess(subscriptionData)
      ? subscriptionData.plan
      : 'FREE'
  const isMobile = useMediaQuery('(max-width: 768px)')

  useEffect(() => {
    if (!isLoaded || !user || isLoadingSubscription) return

    // Get user creation time - fix the date parsing issue
    const userCreatedAt = user.createdAt ? new Date(user.createdAt) : new Date()
    const now = new Date()

    // Calculate time difference in milliseconds
    const timeDifference = now.getTime() - userCreatedAt.getTime()

    // Check if user was created less than one hour ago (3600000 ms = 1 hour)
    const isNewUser = timeDifference < 3600000

    // Check if user has an active subscription using the useUserSubscription hook
    const hasActiveSubscription = userPlan !== 'FREE'

    // Only redirect mobile users without an active subscription who are new (created < 1 hour ago)
    if (isMobile && !hasActiveSubscription && isNewUser) {
      posthog.capture('user_redirected_to_pricing', {
        user_id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        name: `${user.firstName} ${user.lastName}`.trim(),
      })
      navigate({ to: '/pricing' })
    }
  }, [user, isLoaded, navigate, userPlan, isLoadingSubscription, isMobile])

  return null
}
