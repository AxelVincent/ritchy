import { Code, Key } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Link, useMatch } from '@tanstack/react-router'

export function NavApi() {
  const { open } = useSidebar()
  const playgroundMatch = useMatch({
    from: '/_auth/api-playground',
    shouldThrow: false,
  })

  const apiKeysMatch = useMatch({
    from: '/_auth/api-keys',
    shouldThrow: false,
  })

  return (
    <SidebarGroup className="p-0">
      <SidebarGroupLabel className="flex items-center gap-2">
        API
        {open && (
          <Badge variant="amber" className="px-1.5 py-0 text-[10px]">
            Beta
          </Badge>
        )}
      </SidebarGroupLabel>
      {open && (
        <p className="px-2 pb-2 text-[10px] text-muted-foreground">
          Official release: February 1st, 2026
        </p>
      )}
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip="API Playground"
            isActive={playgroundMatch?.pathname === '/api-playground'}
          >
            <Link to="/api-playground">
              <Code className="text-muted-foreground text-sm" />
              <p className="pl-2 font-medium">Playground</p>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip="API Keys"
            isActive={apiKeysMatch?.pathname === '/api-keys'}
          >
            <Link to="/api-keys">
              <Key className="text-muted-foreground text-sm" />
              <p className="pl-2 font-medium">API Keys</p>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
