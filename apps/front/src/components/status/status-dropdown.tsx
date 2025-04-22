import { useUpdatePlaceStatus } from '@/api/mutations/places/status/useUpdatePlaceStatus'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { StatusType } from '@ritchy/types'
import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { StatusBadge } from './status-badge'

interface StatusDropdownProps {
  placeId: string
  currentStatus: StatusType
  onStatusChange: (newStatus: StatusType) => void
}

export const StatusDropdown = ({
  placeId,
  currentStatus,
  onStatusChange,
}: StatusDropdownProps) => {
  const [status, setStatus] = useState<StatusType>(currentStatus)
  const { mutate: updateStatus, isPending } = useUpdatePlaceStatus()

  useEffect(() => {
    setStatus(currentStatus)
  }, [currentStatus])

  const statusOptions: StatusType[] = [
    'NEW',
    'NO_ANSWER',
    'CONTACTED',
    'FOLLOW_UP',
    'MEETING',
    'INTERESTED',
    'WON',
    'LOST',
  ]

  const handleStatusChange = (newStatus: StatusType) => {
    setStatus(newStatus)

    updateStatus(
      { placeId, status: newStatus },
      {
        onSuccess: () => {
          onStatusChange(newStatus)
        },
      },
    )
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-1 p-0 hover:bg-transparent"
          disabled={isPending}
        >
          <StatusBadge status={status} />
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={4}>
        {statusOptions.map((statusOption) => (
          <DropdownMenuItem
            key={statusOption}
            onClick={() => handleStatusChange(statusOption)}
            className="cursor-pointer"
          >
            <StatusBadge status={statusOption} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
