import { Label } from '@/components/ui/label'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export function RitchyLogo() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild className="pointer-events-none">
          <div>
            <div className="text-lg">🐕</div>
            <Label className="text-sm pl-2 font-semibold">Ritchy</Label>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
