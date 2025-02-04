import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export const Route = createRootRoute({
  component: () => {
    const isMobile = window.innerWidth < 768

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
        <Outlet />
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
