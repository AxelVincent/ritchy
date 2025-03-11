'use client'

import { useDeleteList } from '@/api/mutations/lists/useDeleteList'
import { useListsQuery } from '@/api/queries/lists/useLists'
import { CreateListForm } from '@/components/lists/create-list-form'
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
import { cn } from '@/lib/utils'
import { Link, useMatch } from '@tanstack/react-router'
import { ListPlus, MoreHorizontal, Trash2 } from 'lucide-react'
import { useState } from 'react'

const CreateListDialog = ({
  isOpen,
  onOpenChange,
}: { isOpen: boolean; onOpenChange: (open: boolean) => void }) => (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogTrigger asChild>
      <SidebarMenuButton tooltip="Create new list">
        <ListPlus size={16} />
      </SidebarMenuButton>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create new list</DialogTitle>
      </DialogHeader>
      <CreateListForm onSuccess={() => onOpenChange(false)} />
    </DialogContent>
  </Dialog>
)

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
      {open ? (
        <SidebarGroupLabel>
          <div className="w-full flex items-center">
            <span className="flex-1">Lists</span>
            <div className="flex-shrink-0">
              <CreateListDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
              />
            </div>
          </div>
        </SidebarGroupLabel>
      ) : (
        <CreateListDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      )}
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
                  <p
                    className="pl-2 font-medium truncate max-w-[120px]"
                    title={list.name}
                  >
                    {list.name}
                  </p>
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
