'use client'

import { useDeleteList } from '@/api/mutations/lists/useDeleteList'
import { useListsQuery } from '@/api/queries/lists/useLists'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { CreateListForm } from '@/features/lists/components/create-list-form'
import { cn } from '@/lib/utils'
import { Link, useMatch } from '@tanstack/react-router'
import { MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

export function NavCustomLists() {
  const { open } = useSidebar()
  const { data: lists, isLoading } = useListsQuery()
  const deleteList = useDeleteList()
  const match = useMatch({ from: '/_auth/lists/$listId', shouldThrow: false })
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  if (isLoading) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Lists</SidebarGroupLabel>
        <div className="space-y-2 px-2">
          <Skeleton className="w-full" />
          <Skeleton className="w-full" />
        </div>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <SidebarMenuButton className="w-full justify-between">
            {open ? (
              <>
                <span>Lists</span>
                <Plus className="h-4 w-4" />
              </>
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </SidebarMenuButton>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new list</DialogTitle>
          </DialogHeader>
          <CreateListForm onSuccess={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
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
                side={open ? 'bottom' : 'right'}
                align={open ? 'end' : 'start'}
              >
                <DropdownMenuItem
                  onClick={() => deleteList.mutateAsync({ id: list.id })}
                  disabled={deleteList.isPending}
                  className="cursor-pointer"
                >
                  <Trash2 className="text-muted-foreground" />
                  <p>Delete</p>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
