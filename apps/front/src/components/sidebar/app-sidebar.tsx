import { NavCustomLists } from '@/components/sidebar/nav-custom-lists'
import { NavDeprecation } from '@/components/sidebar/nav-deprecation'
import { NavUser } from '@/components/sidebar/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'

import { useIsMobile } from '@/hooks/use-mobile'
import { NavApi } from './nav-api'
import { NavCredits } from './nav-credits'
import { NavHistory } from './nav-history'
import { NavMain } from './nav-main'
import { RitchyLogo } from './ritchy-logo'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const isMobile = useIsMobile()

  return (
    <Sidebar collapsible={isMobile ? 'offcanvas' : 'icon'} {...props}>
      <SidebarHeader>
        <RitchyLogo />
        <NavMain />
        <NavApi />
      </SidebarHeader>
      <SidebarContent>
        <NavCustomLists />
        <NavHistory />
      </SidebarContent>
      <NavCredits />
      <NavDeprecation />
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
