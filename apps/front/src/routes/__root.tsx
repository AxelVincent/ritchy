import { Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export default function RootRoute() {
  const isMobile = window.innerWidth <= 768

  return (
    <div className="bg-background h-screen w-screen">
      {isMobile ? (
        <div className="flex h-full flex-col items-center justify-center bg-zinc-900 p-10 text-white">
          <div className="flex items-center text-lg font-medium">
            <span className="mr-2 text-2xl" role="img" aria-label="Ritchy Logo">
              🐕
            </span>
            Ritchy
          </div>
          <div className="mt-8 text-center">
            <blockquote className="space-y-2">
              <p className="text-lg">
                This application is currently only available on desktop devices.
              </p>
              <footer className="text-sm">See you on your laptop!</footer>
            </blockquote>
          </div>
        </div>
      ) : (
        <>
          <Outlet />
          {process.env.NODE_ENV === 'development' && <TanStackRouterDevtools />}
        </>
      )}
    </div>
  )
}
