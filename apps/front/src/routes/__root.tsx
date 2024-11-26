import { Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export default function RootRoute() {
  return (
    <div className="h-screen w-screen bg-background">
      <Outlet />
      {process.env.NODE_ENV !== 'production' && <TanStackRouterDevtools />}
    </div>
  )
}
