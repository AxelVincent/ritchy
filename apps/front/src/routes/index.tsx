import { createRouter } from '@tanstack/react-router'

import { createRootRoute, createRoute } from '@tanstack/react-router'

import { ErrorPage } from '@/components/error-page'
import { ProtectedLayout } from '@/components/layouts/protected-layout'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import RootRoute from './__root'
import HomeRoute from './home'
import MapDisplayRoute from './map-display'

const routes = {
  public: [
    {
      path: '/',
      component: HomeRoute,
    },
  ],
  protected: [
    {
      path: '/map-display',
      component: MapDisplayRoute,
    },
  ],
} as const

const rootRoute = createRootRoute({
  component: RootRoute,
})

// Create public routes
const publicRoutes = routes.public.map((route) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: route.path,
    component: route.component,
  }),
)

// Create protected routes under protected layout
const protectedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  component: ProtectedLayout,
})

const protectedRoutes = routes.protected.map((route) =>
  createRoute({
    getParentRoute: () => protectedLayoutRoute,
    path: route.path,
    component: route.component,
  }),
)

const routeTree = rootRoute.addChildren([
  ...publicRoutes,
  protectedLayoutRoute.addChildren(protectedRoutes),
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultErrorComponent: ({ error }) => <ErrorPage error={error} />,
  defaultPendingComponent: () => <LoadingSpinner />,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
