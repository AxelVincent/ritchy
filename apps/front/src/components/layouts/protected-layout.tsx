import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { Navigate, Outlet } from '@tanstack/react-router'
import { SidebarInset, SidebarProvider } from '../ui/sidebar'
import { AppSidebar } from './sidebar/app-sidebar'

export const ProtectedLayout = () => {
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
