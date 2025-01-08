'use client'

import { ChevronsUpDown, LogOut, Moon, Sun, UserRoundCog } from 'lucide-react'
import { useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useTheme } from '@/providers/theme-provider'
import { UserButton, UserProfile, useAuth, useUser } from '@clerk/clerk-react'
import { Label } from '../ui/label'

export function NavUser() {
  const { isMobile } = useSidebar()

  const { user } = useUser()
  const { signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="cursor-pointer">
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {/* <UserButton /> */}
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user?.imageUrl} alt={user?.fullName ?? ''} />
                <AvatarFallback className="rounded-lg">
                  {user?.fullName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight cursor-pointer">
                <Label className="truncate font-semibold cursor-pointer">
                  {user?.fullName}
                </Label>
                <Label className="truncate text-xs cursor-pointer">
                  {user?.emailAddresses[0]?.emailAddress}
                </Label>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <UserButton />
                <div className="grid flex-1 text-left text-sm leading-tight cursor-pointer">
                  <Label className="truncate font-semibold cursor-pointer">
                    {user?.fullName}
                  </Label>
                  <Label className="truncate text-xs cursor-pointer">
                    {user?.emailAddresses[0]?.emailAddress}
                  </Label>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="cursor-pointer"
              >
                <Sun
                  className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
                  size={12}
                />
                <Moon
                  className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
                  size={12}
                />
                <Label className="sr-only">Toggle theme</Label>
                {theme === 'dark' ? 'Light' : 'Dark'} mode
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => setIsProfileOpen(true)}
                className="cursor-pointer"
              >
                <UserRoundCog />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => signOut()}
                className="cursor-pointer"
              >
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="h-fit !w-[unset] !max-w-[unset] p-0">
          <UserProfile />
        </DialogContent>
      </Dialog>
    </SidebarMenu>
  )
}
