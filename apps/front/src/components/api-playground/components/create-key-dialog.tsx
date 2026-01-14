import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check } from 'lucide-react'

interface CreateKeyDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  newKeyName: string
  onNewKeyNameChange: (name: string) => void
  createdKey: string | null
  isPending: boolean
  onCreateKey: () => void
  onClose: () => void
}

export const CreateKeyDialog = ({
  isOpen,
  onOpenChange,
  newKeyName,
  onNewKeyNameChange,
  createdKey,
  isPending,
  onCreateKey,
  onClose,
}: CreateKeyDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {createdKey ? 'API Key Created' : 'Create API Key'}
          </DialogTitle>
          <DialogDescription>
            {createdKey
              ? 'Your new API key has been created and selected.'
              : 'Give your API key a name to identify it later.'}
          </DialogDescription>
        </DialogHeader>

        {createdKey ? (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-md font-mono text-sm break-all">
              {createdKey}
            </div>
            <p className="text-sm text-green-600 flex items-center gap-1">
              <Check className="h-4 w-4" />
              Key automatically selected for the playground
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="keyName">Key Name</Label>
            <Input
              id="keyName"
              placeholder="e.g., Production, Development"
              value={newKeyName}
              onChange={(e) => onNewKeyNameChange(e.target.value)}
            />
          </div>
        )}

        <DialogFooter>
          {createdKey ? (
            <Button onClick={onClose}>Done</Button>
          ) : (
            <Button
              onClick={onCreateKey}
              disabled={!newKeyName.trim() || isPending}
            >
              {isPending ? 'Creating...' : 'Create'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
