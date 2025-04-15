import { InstallPrompt } from '@/components/common/InstallPrompt'
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export const Route = createRootRoute({
  component: () => {
    return (
      <>
        <Outlet />
        <div className="fixed bottom-4 left-4 z-50">
          <InstallPrompt />
        </div>
        {import.meta.env.DEV && (
          <TanStackRouterDevtools
            position="bottom-right"
            initialIsOpen={false}
          />
        )}
      </>
    )
  },
})
