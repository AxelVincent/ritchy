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
import { cn } from '@/lib/utils'
import type { ContactType } from '@ritchy/types'
import { Building2, User } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'

interface CreateContactFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateContact: (
    firstName: string,
    lastName: string | undefined,
    type: ContactType,
  ) => Promise<unknown>
}

const contactFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  type: z.enum(['physical', 'legal']),
})

export const CreateContactForm = ({
  open,
  onOpenChange,
  onCreateContact,
}: CreateContactFormProps) => {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [type, setType] = useState<ContactType>('physical')
  const [isCreating, setIsCreating] = useState(false)
  const [errors, setErrors] = useState<{
    firstName?: string
    lastName?: string
    type?: string
  }>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    const result = contactFormSchema.safeParse({
      firstName,
      lastName: lastName || undefined,
      type,
    })

    if (!result.success) {
      const fieldErrors: typeof errors = {}
      for (const error of result.error.errors) {
        const field = error.path[0] as keyof typeof errors
        fieldErrors[field] = error.message
      }
      setErrors(fieldErrors)
      return
    }

    setErrors({})
    setIsCreating(true)

    try {
      await onCreateContact(firstName, lastName || undefined, type)
      // Reset form and close dialog on success
      setFirstName('')
      setLastName('')
      setType('physical')
      onOpenChange(false)
    } catch (error) {
      // Error is handled by the parent via toast
      console.error('Failed to create contact:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleCancel = () => {
    setFirstName('')
    setLastName('')
    setType('physical')
    setErrors({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Contact</DialogTitle>
          <DialogDescription>
            Add a new contact for this place. You can add emails and phone
            numbers after creation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Contact Type */}
            <div className="space-y-2">
              <Label>Contact Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={type === 'physical' ? 'default' : 'outline'}
                  className={cn('flex-1 gap-2')}
                  onClick={() => setType('physical')}
                  disabled={isCreating}
                >
                  <User className="h-4 w-4" />
                  Individual
                </Button>
                <Button
                  type="button"
                  variant={type === 'legal' ? 'default' : 'outline'}
                  className={cn('flex-1 gap-2')}
                  onClick={() => setType('legal')}
                  disabled={isCreating}
                >
                  <Building2 className="h-4 w-4" />
                  Company
                </Button>
              </div>
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type}</p>
              )}
            </div>

            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First Name {type === 'legal' ? '/ Company Name' : ''}
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="firstName"
                placeholder={
                  type === 'legal' ? 'Company name' : 'Enter first name'
                }
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isCreating}
                className={errors.firstName ? 'border-destructive' : ''}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName">
                {type === 'legal' ? 'Additional Info' : 'Last Name'} (Optional)
              </Label>
              <Input
                id="lastName"
                placeholder={
                  type === 'legal'
                    ? 'Additional information'
                    : 'Enter last name'
                }
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isCreating}
                className={errors.lastName ? 'border-destructive' : ''}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
