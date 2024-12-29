import { useCreateList } from '@/api/mutations/lists/useCreateList'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { EMOJI_CATEGORIES } from './emojis'

export const ALL_EMOJIS = Object.values(EMOJI_CATEGORIES).flatMap(
  (category) => category.emojis,
)

// Get random emoji for default value
const getRandomEmoji = () =>
  ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)]

// Move this to shared types package if needed across components
const schema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name is too long'),
  emoji: z.string().min(1, 'Emoji is required'),
})

interface CreateListFormProps {
  onSuccess?: (listId: string) => void
}

export function CreateListForm({ onSuccess }: CreateListFormProps) {
  const { toast } = useToast()
  const createList = useCreateList()
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const [defaultEmoji] = useState(getRandomEmoji)
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const scrollToCategory = (categoryKey: string) => {
    categoryRefs.current[categoryKey]?.scrollIntoView({ behavior: 'smooth' })
  }

  const form = useForm({
    defaultValues: {
      name: '',
      emoji: defaultEmoji,
    },
    // Add a validator to support Zod usage in Form and Field (no longer needed with zod@3.24.0 or higher)
    validatorAdapter: zodValidator(),
    validators: {
      onChange: schema,
    },
    onSubmit: async ({ value }) => {
      await createList.mutateAsync(value, {
        onSuccess: (newList) => {
          toast({
            title: 'List created successfully',
            description: 'You can now add items to your list',
          })
          onSuccess?.(newList.id)
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error.message,
            variant: 'destructive',
          })
        },
      })
    },
  })

  return (
    <form
      className="my-4"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <div className="flex gap-4 items-end">
        <form.Field name="emoji">
          {(field) => (
            <div className="grid gap-1.5">
              <Label htmlFor={field.name}>Emoji</Label>
              <div className="relative" ref={emojiPickerRef}>
                <Button
                  type="button"
                  variant="outline"
                  className="w-9 h-9  text-lg"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <span>{field.state.value}</span>
                </Button>
                {showEmojiPicker && (
                  <div className="fixed mt-1 bg-background border rounded-md shadow-lg z-[100] min-w-[300px]">
                    <ScrollArea className="h-[300px] p-2">
                      {Object.entries(EMOJI_CATEGORIES).map(
                        ([key, category]) => (
                          <div
                            key={key}
                            className="space-y-1"
                            // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
                            ref={(el) => (categoryRefs.current[key] = el)}
                          >
                            <div className="text-sm font-medium text-muted-foreground">
                              {category.label}
                            </div>
                            <div className="grid grid-cols-8">
                              {category.emojis.map((emoji) => (
                                <Button
                                  key={emoji}
                                  type="button"
                                  variant="ghost"
                                  className="w-9 h-9 p-0 text-xl"
                                  onClick={() => {
                                    field.handleChange(emoji)
                                    setShowEmojiPicker(false)
                                  }}
                                >
                                  {emoji}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ),
                      )}
                    </ScrollArea>

                    <div className="border-t p-2">
                      <div className="flex overflow-x-auto">
                        {Object.entries(EMOJI_CATEGORIES).map(
                          ([key, category]) => {
                            const Icon = category.icon
                            return (
                              <Button
                                key={key}
                                variant="ghost"
                                size="sm"
                                className="flex-shrink-0"
                                onClick={() => scrollToCategory(key)}
                              >
                                <Icon className="h-4 w-4" />
                              </Button>
                            )
                          },
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </form.Field>

        <form.Field name="name">
          {(field) => (
            <div className="grid gap-1.5 flex-1">
              <Label htmlFor={field.name}>Name</Label>
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

        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          // biome-ignore lint/correctness/noChildrenProp: <explanation>
          children={([canSubmit, isSubmitting]) => (
            <Button type="submit" size="sm" disabled={!canSubmit}>
              {isSubmitting ? '...' : 'Submit'}
            </Button>
          )}
        />
      </div>
    </form>
  )
}
