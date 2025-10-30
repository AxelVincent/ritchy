import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Mail, Phone, Plus } from 'lucide-react'

interface ContactActionsProps {
  onAddEmail: () => void
  onAddPhone: () => void
  disabled?: boolean
}

export const ContactActions = ({
  onAddEmail,
  onAddPhone,
  disabled = false,
}: ContactActionsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1 sm:gap-2" disabled={disabled}>
          <Plus className="h-4 w-4" />
          <span className="">Add Contact Info</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onAddEmail}>
          <Mail className="h-4 w-4 mr-2" />
          Add Email
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onAddPhone}>
          <Phone className="h-4 w-4 mr-2" />
          Add Phone
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
