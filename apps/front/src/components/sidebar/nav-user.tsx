'use client'

import {
  Blocks,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Moon,
  Rocket,
  Sun,
  UserRoundCog,
} from 'lucide-react'
import { useState } from 'react'

import { useCreatePortalSession } from '@/api/mutations/payments/useCreatePortalSession'
import { useUserMe } from '@/api/queries/users/useUserMe'
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
import { useNavigate } from '@tanstack/react-router'
import { Badge } from '../ui/badge'
import { Label } from '../ui/label'

export function NavUser() {
  const { isMobile } = useSidebar()
  const navigate = useNavigate()
  const { user } = useUser()
  const { signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const createPortalSession = useCreatePortalSession()

  const { data: me } = useUserMe()
  const userPlan = me?.plan || 'FREE'
  const hasActiveSubscription = userPlan !== 'FREE'

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="cursor-pointer">
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user?.imageUrl} alt={user?.fullName ?? ''} />
                <AvatarFallback className="rounded-lg">
                  {user?.fullName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <span className="truncate font-semibold min-w-0 flex-shrink">
                  {user?.fullName}
                </span>
                <Badge
                  variant="secondary"
                  className="w-fit text-xs font-medium bg-primary/10 text-primary hover:bg-primary/15 flex-shrink-0"
                >
                  {userPlan}
                </Badge>
              </div>
              <ChevronsUpDown className="ml-auto size-4 flex-shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5">
                <UserButton />
                <div className="flex flex-1 items-center gap-2">
                  <span className="truncate font-semibold">
                    {user?.fullName}
                  </span>
                  <Badge
                    variant="secondary"
                    className="w-fit text-xs font-medium bg-primary/10 text-primary hover:bg-primary/15"
                  >
                    {userPlan}
                  </Badge>
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
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  navigate({ to: '/integrations' })
                }}
              >
                <Blocks />
                Integrations
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  navigate({ to: '/pricing' })
                }}
              >
                <Rocket />
                Pricing
              </DropdownMenuItem>
              {hasActiveSubscription && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={async () => {
                    const response = await createPortalSession.mutateAsync({})
                    if (response && 'url' in response) {
                      window.location.href = response.url
                    } else {
                      console.error(
                        'Failed to create portal session:',
                        response,
                      )
                    }
                  }}
                >
                  <CreditCard />
                  Manage subscription
                </DropdownMenuItem>
              )}
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
