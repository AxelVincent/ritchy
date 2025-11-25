import { useUserMe } from '@/api/queries/users/useUserMe'
import { UpgradeModalProvider } from '@/components/marketing/UpgradeModalContext'
import { AppSidebar } from '@/components/sidebar/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

import { useIsMobile } from '@/hooks/use-mobile'
import { SignedIn, SignedOut, useAuth } from '@clerk/clerk-react'
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
  return (
    <>
      <SignedIn>
        <PostHogIdentify />
        <ClerkRedirect />
        <AuthChecksAndRedirects>
          <UpgradeModalProvider>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset className="h-full w-full overflow-hidden">
                <Outlet />
              </SidebarInset>
            </SidebarProvider>
          </UpgradeModalProvider>
        </AuthChecksAndRedirects>
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
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: `${user.firstName} ${user.lastName}`.trim(),
      })
    }
  }, [user])

  return null
}

// Add this component to handle Clerk signup redirection
function ClerkRedirect() {
  const { user, isLoaded } = useUser()
  const navigate = useNavigate()
  const { data: meData, isLoading: isLoadingMe } = useUserMe()
  const userPlan = meData?.plan || 'FREE'
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!isLoaded || !user || isLoadingMe) return

    // Get user creation time - fix the date parsing issue
    const userCreatedAt = user.createdAt ? new Date(user.createdAt) : new Date()
    const now = new Date()

    // Calculate time difference in milliseconds
    const timeDifference = now.getTime() - userCreatedAt.getTime()

    // Check if user was created less than one hour ago (3600000 ms = 1 hour)
    const isNewUser = timeDifference < 3600000

    // Check if user has an active subscription using the useUserMe hook
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
  }, [user, isLoaded, navigate, userPlan, isLoadingMe, isMobile])

  return null
}

function AuthChecksAndRedirects({ children }: { children: React.ReactNode }) {
  const { user, isLoaded: isClerkLoaded } = useUser()
  const { isSignedIn } = useAuth()
  const navigate = useNavigate()

  const { data: meData, isLoading: isLoadingMe, error: meError } = useUserMe()

  const userPlan = meData?.plan || null

  const isMobile = useIsMobile()

  // Main effect for pricing redirects
  useEffect(() => {
    if (!isClerkLoaded || !isSignedIn || isLoadingMe || !user) {
      return
    }

    if (meError) {
      return
    }

    // This check ensures we don't proceed if userPlan is still null after loading and no error
    if (!userPlan && !isLoadingMe && !meError) {
      console.warn(
        'User plan could not be determined from /me endpoint after loading.',
      )
      return
    }

    // Pricing redirect logic for new mobile users
    if (userPlan) {
      const userCreatedAt = user.createdAt
        ? new Date(user.createdAt)
        : new Date()
      const now = new Date()
      const timeDifference = now.getTime() - userCreatedAt.getTime()
      const isNewUser = timeDifference < 3600000 // 1 hour
      const hasActivePaidSubscription = userPlan !== 'FREE'

      if (isMobile && !hasActivePaidSubscription && isNewUser) {
        posthog.capture('user_redirected_to_pricing_auth_checks', {
          user_id: user.id,
          user_plan: userPlan,
          is_new_user: isNewUser,
        })
        navigate({ to: '/pricing' })
      }
    }
  }, [
    user,
    isClerkLoaded,
    isSignedIn,
    navigate,
    userPlan,
    isLoadingMe,
    meError,
    isMobile,
  ])

  // Combined Loading State
  if (!isClerkLoaded || isLoadingMe) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        Loading Ritchy...
      </div>
    )
  }

  // Error state for /users/me
  if (isSignedIn && meError) {
    // meError implies userPlan might be null or data is incomplete
    return (
      <div className="flex h-screen w-screen items-center justify-center text-red-500">
        Error loading your user details. Please refresh or contact support.
      </div>
    )
  }
  // Fallback if userPlan is still null after loading & no specific error (should be rare)
  if (isSignedIn && !userPlan && !isLoadingMe && !meError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center text-orange-500">
        Could not determine your subscription status. Please try refreshing.
      </div>
    )
  }

  return <>{children}</>
}
