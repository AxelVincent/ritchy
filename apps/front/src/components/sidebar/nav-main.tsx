import { Search } from 'lucide-react'

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Link, useMatch } from '@tanstack/react-router'
export function NavMain() {
  const match = useMatch({
    from: '/_auth/search/',
    shouldThrow: false,
  })

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          tooltip="Explore places"
          isActive={match?.pathname === '/search/'}
        >
          <Link to="/search">
            <Search className="text-muted-foreground text-sm" />
            <p className="pl-2 font-medium">Explore places</p>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
