import { useUpsertList } from '@/api/mutations/lists/useUpsertList'
import { Button } from '@/components/ui/button'
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
} from '@/components/ui/emoji-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { useRef, useState } from 'react'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name is too long'),
  emoji: z.string().min(1, 'Emoji is required'),
})

interface UpsertListFormProps {
  onSuccess?: (listId: string) => void
  initialValues?: {
    id: string
    name: string
    emoji: string
  }
}

export function UpsertListForm({
  onSuccess,
  initialValues,
}: UpsertListFormProps) {
  const { toast } = useToast()
  const upsertList = useUpsertList()
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const form = useForm({
    defaultValues: {
      name: initialValues?.name ?? '',
      emoji: initialValues?.emoji ?? '🙂',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: schema,
    },
    onSubmit: async ({ value }) => {
      await upsertList.mutateAsync(
        {
          ...value,
          id: initialValues?.id,
        },
        {
          onSuccess: (newList) => {
            toast({
              title: 'List created or updated successfully',
              description: 'You can now add items to your list',
            })
            onSuccess?.(newList.id)
          },
          onError: () => {
            toast({
              title: 'Error',
              description: 'Failed to create or update list',
              variant: 'destructive',
            })
          },
        },
      )
    },
  })

  return (
    <form
      ref={formRef}
      className="my-4 w-full"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <div className="space-y-4">
        <div className="flex gap-4 items-end">
          <form.Field name="emoji">
            {(field) => (
              <div className="grid gap-1.5">
                <Label htmlFor={field.name}>Emoji</Label>
                <Popover
                  open={isEmojiPickerOpen}
                  onOpenChange={setIsEmojiPickerOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-9 h-9 text-lg"
                    >
                      <span>{field.state.value}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-1"
                    side="right"
                    align="start"
                    sideOffset={4}
                  >
                    <EmojiPicker
                      className="flex flex-col emoji-picker-container w-full"
                      onEmojiSelect={({ emoji }) => {
                        setIsEmojiPickerOpen(false)
                        field.handleChange(emoji)
                      }}
                    >
                      <EmojiPickerSearch />
                      <div className="flex-1 min-h-0 emoji-picker-viewport">
                        <EmojiPickerContent />
                      </div>
                      <EmojiPickerFooter />
                    </EmojiPicker>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </form.Field>

          <form.Field name="name">
            {(field) => (
              <div className="grid gap-1.5 flex-1">
                <Label htmlFor={field.name} className="ml-2">
                  Name
                </Label>
                <Input
                  placeholder="Name"
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  data-form-type="other"
                  aria-autocomplete="none"
                />
              </div>
            )}
          </form.Field>

          <div className="grid gap-1.5">
            <Label>&nbsp;</Label>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" size="sm" disabled={!canSubmit}>
                  {isSubmitting ? '...' : initialValues ? 'Update' : 'Create'}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </div>
      </div>
    </form>
  )
}
