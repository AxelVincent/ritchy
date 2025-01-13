import { Label } from '@/components/ui/label'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function RitchyLogo() {
  const { open, toggleSidebar } = useSidebar()
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center justify-center">
          {open && (
            <>
              <SidebarMenuButton asChild className="pointer-events-none">
                <div>
                  <div className="text-lg">🐕</div>
                  <Label className="text-sm pl-2 font-semibold">Ritchy</Label>
                </div>
              </SidebarMenuButton>
              <SidebarMenuButton
                tooltip="Collapse sidebar"
                onClick={toggleSidebar}
                className="w-8 h-8 flex items-center justify-center"
              >
                <ChevronLeft className="h-4 w-4" />
              </SidebarMenuButton>
            </>
          )}
          {!open && (
            <SidebarMenuButton
              tooltip="Expand sidebar"
              onClick={toggleSidebar}
              className="w-8 h-8 flex items-center justify-center"
            >
              <ChevronRight className="h-4 w-4" />
            </SidebarMenuButton>
          )}
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
