import { CopyCell } from '@/components/data-table/columns/utils/ColumnCells'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Phone } from '@ritchy/types'
import { PhoneTypeEnum } from '@ritchy/types'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Phone as PhoneIcon,
  Plus,
  Star,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface PhoneDisplayProps {
  phones: Phone[]
  onAddPhone: (
    phone: string,
    type: (typeof PhoneTypeEnum.options)[number],
  ) => Promise<void>
  onDeletePhone: (id: string) => Promise<void>
  onSetPrimary: (id: string, isPrimary: boolean) => Promise<void>
  className?: string
  showAddForm?: boolean
  onShowAddFormChange?: (show: boolean) => void
}

type PhoneValidationState = 'idle' | 'valid' | 'invalid'

export const getPhoneTypeVariant = (type: Phone['type']) => {
  switch (type) {
    case 'MOBILE':
    case 'PERSONAL_NUMBER':
      return 'default'
    case 'FIXED_LINE':
    case 'FIXED_LINE_OR_MOBILE':
      return 'secondary'
    case 'TOLL_FREE':
    case 'SHARED_COST':
      return 'outline'
    default:
      return 'secondary'
  }
}

export const formatPhoneType = (type: string) => {
  return type
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export const PhoneDisplay = ({
  phones,
  onAddPhone,
  onDeletePhone,
  onSetPrimary,
  className,
  showAddForm: externalShowAddForm,
  onShowAddFormChange,
}: PhoneDisplayProps) => {
  const [newPhone, setNewPhone] = useState('')
  const [phoneType, setPhoneType] =
    useState<(typeof PhoneTypeEnum.options)[number]>('MOBILE')
  const [isAdding, setIsAdding] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isSettingPrimary, setIsSettingPrimary] = useState<string | null>(null)
  const [internalShowAddForm, setInternalShowAddForm] = useState(false)
  const [phoneValidation, setPhoneValidation] =
    useState<PhoneValidationState>('idle')
  const [validationMessage, setValidationMessage] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean
    phone: Phone | null
  }>({ open: false, phone: null })
  const phoneInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  // Use external control if provided, otherwise use internal state
  const showAddForm = externalShowAddForm ?? internalShowAddForm
  const setShowAddForm = onShowAddFormChange ?? setInternalShowAddForm

  // Auto-focus the input when the form opens
  useEffect(() => {
    if (showAddForm) {
      // Small delay to ensure the form is rendered
      setTimeout(() => {
        formRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
        phoneInputRef.current?.focus()
      }, 100)
    }
  }, [showAddForm])

  // Basic phone validation
  const validatePhone = (
    phone: string,
  ): { isValid: boolean; message: string } => {
    if (!phone.trim()) {
      return { isValid: false, message: '' }
    }

    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '')

    // Check if phone already exists
    const phoneExists = phones.some((p) => p.phone === phone.trim())
    if (phoneExists) {
      return { isValid: false, message: 'This phone number already exists' }
    }

    // Basic validation: should have at least 7 digits
    if (digitsOnly.length < 7) {
      return { isValid: false, message: 'Phone number is too short' }
    }

    if (digitsOnly.length > 15) {
      return { isValid: false, message: 'Phone number is too long' }
    }

    return { isValid: true, message: 'Phone number looks good' }
  }

  const handlePhoneChange = (value: string) => {
    setNewPhone(value)

    if (!value.trim()) {
      setPhoneValidation('idle')
      setValidationMessage('')
      return
    }

    const validation = validatePhone(value)
    setPhoneValidation(validation.isValid ? 'valid' : 'invalid')
    setValidationMessage(validation.message)
  }

  const handleAddPhone = async () => {
    if (!newPhone.trim() || phoneValidation !== 'valid') return

    setIsAdding(true)
    try {
      await onAddPhone(newPhone.trim(), phoneType)
      setNewPhone('')
      setPhoneType('MOBILE')
      setShowAddForm(false)
      setPhoneValidation('idle')
      setValidationMessage('')
    } catch (error) {
      console.error('Failed to add phone:', error)
      alert('Failed to add phone. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteClick = (phone: Phone) => {
    setDeleteConfirmation({ open: true, phone })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation.phone) return

    const phoneId = deleteConfirmation.phone?.id
    if (!phoneId) return
    setIsDeleting(phoneId)
    setDeleteConfirmation({ open: false, phone: null })

    try {
      await onDeletePhone(phoneId)
    } catch (error) {
      console.error('Failed to delete phone:', error)
      alert('Failed to delete phone. Please try again.')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmation({ open: false, phone: null })
  }

  const handleSetPrimary = async (id: string, isPrimary: boolean) => {
    setIsSettingPrimary(id)
    try {
      await onSetPrimary(id, isPrimary)
    } catch (error) {
      console.error(
        `Failed to ${isPrimary ? 'set' : 'unset'} primary phone:`,
        error,
      )
      alert(
        `Failed to ${isPrimary ? 'set' : 'unset'} primary phone. Please try again.`,
      )
    } finally {
      setIsSettingPrimary(null)
    }
  }

  const handleCancelAdd = () => {
    setNewPhone('')
    setPhoneType('MOBILE')
    setShowAddForm(false)
    setPhoneValidation('idle')
    setValidationMessage('')
  }

  const getValidationIcon = () => {
    switch (phoneValidation) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'invalid':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getInputBorderColor = () => {
    switch (phoneValidation) {
      case 'valid':
        return 'border-green-500 focus-visible:ring-green-500'
      case 'invalid':
        return 'border-red-500 focus-visible:ring-red-500'
      default:
        return ''
    }
  }

  const formatDate = (dateString: string | Date) => {
    if (typeof dateString === 'string') {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }
    return dateString.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className={cn('space-y-4', className)}>
      {phones.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PhoneIcon className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Phones</h3>
            <Badge variant="secondary">{phones.length}</Badge>
          </div>
        </div>
      )}

      {/* Updated container with @container query support */}
      <div className="@container">
        <div className="flex flex-col @lg:flex-row @lg:flex-wrap gap-4">
          {/* Add Phone Form - Unified sizing */}
          {showAddForm && (
            <Card
              ref={formRef}
              className="border-dashed border-2 border-primary/20 bg-primary/5 w-full @lg:flex-1 @lg:min-w-[290px] @lg:max-w-[350px]"
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Phone Number
                </CardTitle>
                <CardDescription>
                  Enter a phone number and select its type.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-phone">Phone Number</Label>
                    <div className="relative">
                      <Input
                        ref={phoneInputRef}
                        id="new-phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={newPhone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (
                            e.key === 'Enter' &&
                            phoneValidation === 'valid'
                          ) {
                            handleAddPhone()
                          } else if (e.key === 'Escape') {
                            handleCancelAdd()
                          }
                        }}
                        className={cn(getInputBorderColor())}
                        autoFocus
                      />
                      {getValidationIcon() && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {getValidationIcon()}
                        </div>
                      )}
                    </div>
                    {validationMessage && (
                      <div
                        className={cn(
                          'text-sm flex items-center gap-1',
                          phoneValidation === 'valid'
                            ? 'text-green-600'
                            : 'text-red-600',
                        )}
                      >
                        {getValidationIcon()}
                        {validationMessage}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone-type">Phone Type</Label>
                    <Select
                      value={phoneType}
                      onValueChange={(value) =>
                        setPhoneType(value as typeof phoneType)
                      }
                    >
                      <SelectTrigger id="phone-type">
                        <SelectValue placeholder="Select phone type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PhoneTypeEnum.options.map((type) => (
                          <SelectItem key={type} value={type}>
                            {formatPhoneType(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleAddPhone}
                      disabled={isAdding || phoneValidation !== 'valid'}
                      size="sm"
                    >
                      {isAdding ? 'Adding...' : 'Add Phone'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelAdd}
                      disabled={isAdding}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {phones.map((phone) => (
            <Card
              key={phone.id}
              className={cn(
                'w-full @lg:flex-1 @lg:min-w-[290px] @lg:max-w-[350px]',
                phone.isPrimary && 'ring-2 ring-primary',
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between min-w-0 gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex-1 min-w-0">
                      <CopyCell
                        content={phone.phone}
                        href={`tel:${phone.phone}`}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Star icon to set/unset primary */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        phone.id && handleSetPrimary(phone.id, !phone.isPrimary)
                      }
                      disabled={isSettingPrimary === phone.id}
                      title={
                        phone.isPrimary ? 'Unset as Primary' : 'Set as Primary'
                      }
                    >
                      <Star
                        className={cn(
                          'h-4 w-4',
                          phone.isPrimary && 'fill-current',
                        )}
                      />
                      <span className="sr-only">
                        {phone.isPrimary
                          ? 'Unset as Primary'
                          : 'Set as Primary'}
                      </span>
                    </Button>
                    {/* Delete icon */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(phone)}
                      disabled={isDeleting === phone.id}
                      title="Delete Phone"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Phone Type */}
                  {phone.type && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Type:
                      </span>
                      <Badge variant={getPhoneTypeVariant(phone.type)}>
                        {formatPhoneType(phone.type)}
                      </Badge>
                    </div>
                  )}

                  {/* Timestamps */}
                  {phone.createdAt && phone.updatedAt && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Created: {formatDate(phone.createdAt)}</span>
                      <span>Updated: {formatDate(phone.updatedAt)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmation.open}
        onOpenChange={(open) => {
          if (!open) handleDeleteCancel()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Phone Number
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this phone number? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteConfirmation.phone && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium break-all">
                  {deleteConfirmation.phone.phone}
                </span>
                {deleteConfirmation.phone.type && (
                  <Badge variant="outline" className="flex-shrink-0">
                    {formatPhoneType(deleteConfirmation.phone.type)}
                  </Badge>
                )}
                {deleteConfirmation.phone.isPrimary && (
                  <Badge variant="outline" className="flex-shrink-0">
                    Primary
                  </Badge>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleDeleteCancel}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete Phone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
