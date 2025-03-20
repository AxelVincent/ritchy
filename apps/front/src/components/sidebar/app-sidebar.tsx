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
import { useMediaQuery } from '@/hooks/use-media-query'
import { NavHistory } from './nav-history'
import { NavMain } from './nav-main'
import { RitchyLogo } from './ritchy-logo'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const isMobile = useMediaQuery('(max-width: 768px)')

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
        <div className="fixed top-4 left-4 z-50 bg-background rounded-md shadow-md p-2">
          <SidebarTrigger />
        </div>
      )}
    </>
  )
}
