import { NavCustomLists } from '@/components/sidebar/nav-custom-lists'
import { NavUser } from '@/components/sidebar/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavHistory } from './nav-history'
import { NavMain } from './nav-main'
import { RitchyLogo } from './ritchy-logo'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
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
  )
}
