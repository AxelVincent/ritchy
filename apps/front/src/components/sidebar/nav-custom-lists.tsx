'use client'

import { useListsQuery } from '@/api/queries/lists/useLists'
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
import { Link, useMatch } from '@tanstack/react-router'
import { Folder, Forward, MoreHorizontal, Trash2 } from 'lucide-react'

export function NavCustomLists() {
  const { isMobile } = useSidebar()
  const { data: lists, isLoading } = useListsQuery()
  const match = useMatch({ from: '/_auth/lists/$listId', shouldThrow: false })

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
              isActive={match?.params.listId === list.id}
              className={cn('justify-between')}
            >
              <Link to={`/lists/${list.id}`}>
                <div className="flex items-center gap-2">
                  <p className="text-sm">{list.emoji}</p>
                  <p className="pl-2 font-medium">{list.name}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {list.itemCount}
                </p>
              </Link>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover>
                  <MoreHorizontal />
                  <p className="sr-only">More</p>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-48 rounded-lg"
                side={isMobile ? 'bottom' : 'right'}
                align={isMobile ? 'end' : 'start'}
              >
                <DropdownMenuItem>
                  <Folder className="text-muted-foreground" />
                  <p>View Project</p>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Forward className="text-muted-foreground" />
                  <p>Share Project</p>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Trash2 className="text-muted-foreground" />
                  <p>Delete Project</p>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
