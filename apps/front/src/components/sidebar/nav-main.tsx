import { FileUp, Search } from 'lucide-react'

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Link, useMatch } from '@tanstack/react-router'
export function NavMain() {
  const searchMatch = useMatch({
    from: '/_auth/search/',
    shouldThrow: false,
  })

  const importMatch = useMatch({
    from: '/_auth/import',
    shouldThrow: false,
  })

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          tooltip="Explore places"
          isActive={searchMatch?.pathname === '/search/'}
        >
          <Link
            to="/search"
            search={{
              mode: 'keyword',
            }}
          >
            <Search className="text-muted-foreground text-sm" />
            <p className="pl-2 font-medium">Explore places</p>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          tooltip="Import from CSV"
          isActive={importMatch?.pathname === '/import'}
        >
          <Link to="/import">
            <FileUp className="text-muted-foreground text-sm" />
            <p className="pl-2 font-medium">Import CSV</p>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
