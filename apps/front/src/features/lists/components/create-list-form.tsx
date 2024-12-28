import { useCreateList } from '@/api/mutations/lists/useCreateList'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'

// Define the emoji category structure
export const EMOJI_CATEGORIES = {
  markers: {
    label: 'Markers & Highlights',
    emojis: ['📍', '🎯', '⭐', '💫', '🌟', '✨', '💡', '📌'],
  },
  geography: {
    label: 'Geographic & Maps',
    emojis: ['🗺️', '🌍', '🌎', '🌏'],
  },
  landmarks: {
    label: 'Natural Landmarks',
    emojis: ['🏔️', '⛰️', '🌋', '🗻', '🏞️', '🌅'],
  },
  outdoors: {
    label: 'Beaches & Outdoors',
    emojis: ['🏖️', '🏝️', '🏕️', '⛺'],
  },
  attractions: {
    label: 'Attractions & Entertainment',
    emojis: ['🎪', '🎡', '🎢', '🎠', '🏰'],
  },
  cultural: {
    label: 'Cultural & Religious Sites',
    emojis: ['🏛️', '⛩️', '🕌', '⛪', '🕍', '🏺'],
  },
  food: {
    label: 'Food & Drinks',
    emojis: ['🍽️', '🥂', '☕'],
  },
  arts: {
    label: 'Arts & Culture',
    emojis: ['🎨', '🎭', '🎬', '🎼'],
  },
} as const

// Get first emoji for default value
export const DEFAULT_EMOJI = EMOJI_CATEGORIES.markers.emojis[0]

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

  const form = useForm({
    defaultValues: {
      name: '',
      emoji: '📍',
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
                  className="w-12"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  {field.state.value}
                </Button>
                {showEmojiPicker && (
                  <div className="fixed mt-1 p-2 bg-background border rounded-md shadow-lg space-y-3 max-h-[400px] overflow-y-auto z-[100] min-w-[300px]">
                    {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => (
                      <div key={key} className="space-y-1">
                        <div className="text-sm font-medium text-muted-foreground px-1">
                          {category.label}
                        </div>
                        <div className="grid grid-cols-6 gap-1">
                          {category.emojis.map((emoji) => (
                            <Button
                              key={emoji}
                              type="button"
                              variant="ghost"
                              className="w-8 h-8 p-0"
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
                    ))}
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
