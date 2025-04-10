import { NavCustomLists } from '@/components/sidebar/nav-custom-lists'
import { NavUser } from '@/components/sidebar/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'

import { useIsMobile } from '@/hooks/use-mobile'
import { NavHistory } from './nav-history'
import { NavMain } from './nav-main'
import { RitchyLogo } from './ritchy-logo'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const isMobile = useIsMobile()

  return (
    <>
      <Sidebar collapsible={isMobile ? 'offcanvas' : 'icon'} {...props}>
        <SidebarHeader>
          <RitchyLogo />
          <NavMain />
        </SidebarHeader>
        <SidebarContent>
          <NavCustomLists />
          <NavHistory />
        </SidebarContent>
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      {isMobile && (
        <div className="fixed top-4 left-2 z-50 bg-background rounded-md shadow-md p-2">
          <SidebarTrigger />
        </div>
      )}
    </>
  )
}
