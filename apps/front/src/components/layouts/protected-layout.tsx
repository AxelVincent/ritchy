import { Outlet } from '@tanstack/react-router'
import { SidebarInset, SidebarProvider } from '../ui/sidebar'
import { AppSidebar } from './sidebar/app-sidebar'

export const ProtectedLayout = () => {
  return (
    <SidebarProvider open={false}>
      <AppSidebar />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
