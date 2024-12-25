'use client'

import { useCustomListsQuery } from '@/api/queries/lists/useCustomLists'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import { Folder, Forward, MoreHorizontal, Trash2 } from 'lucide-react'

export function NavCustomLists() {
  const { isMobile } = useSidebar()
  const { data: lists, isLoading } = useCustomListsQuery()

  if (isLoading) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Custom Lists</SidebarGroupLabel>
        <div className="space-y-2 px-2">
          <Skeleton className="w-full" />
          <Skeleton className="w-full" />
        </div>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Lists</SidebarGroupLabel>
      <SidebarMenu>
        {lists?.map((list) => (
          <SidebarMenuItem key={list.id}>
            <SidebarMenuButton
              asChild
              tooltip={list.name}
              className={cn('justify-between')}
            >
              <Link to={`/lists/${list.id}`} className="">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{list.emoji}</span>
                  <span>{list.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {list.itemCount}
                </span>
              </Link>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover>
                  <MoreHorizontal />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-48 rounded-lg"
                side={isMobile ? 'bottom' : 'right'}
                align={isMobile ? 'end' : 'start'}
              >
                <DropdownMenuItem>
                  <Folder className="text-muted-foreground" />
                  <span>View Project</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Forward className="text-muted-foreground" />
                  <span>Share Project</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Trash2 className="text-muted-foreground" />
                  <span>Delete Project</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
