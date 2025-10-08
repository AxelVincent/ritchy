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
import { Button } from '../ui/button'
import { NavCredits } from './nav-credits'
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
        <NavCredits />
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      {isMobile && (
        <Button className="fixed top-2 left-2 z-50 bg-background border border-border">
          <SidebarTrigger className="h-5 w-5 text-foreground" />
        </Button>
      )}
    </>
  )
}
