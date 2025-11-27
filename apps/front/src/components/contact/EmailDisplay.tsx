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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
import type { Email } from '@ritchy/types'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  Mail,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { QualityBadge } from './QualityBadge'

interface EmailDisplayProps {
  emails: Email[]
  onAddEmail: (email: string) => Promise<void>
  onDeleteEmail: (id: string) => Promise<void>
  onSetPrimary: (id: string, isPrimary: boolean) => Promise<void>
  className?: string
  showAddForm?: boolean
  onShowAddFormChange?: (show: boolean) => void
}

type EmailValidationState = 'idle' | 'valid' | 'invalid' | 'checking'

// Zod schema for email validation
const emailSchema = z.object({
  email: z
    .string()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
})

export const EmailDisplay = ({
  emails,
  onAddEmail,
  onDeleteEmail,
  onSetPrimary,
  className,
  showAddForm: externalShowAddForm,
  onShowAddFormChange,
}: EmailDisplayProps) => {
  const [newEmail, setNewEmail] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isSettingPrimary, setIsSettingPrimary] = useState<string | null>(null)
  const [internalShowAddForm, setInternalShowAddForm] = useState(false)
  const [emailValidation, setEmailValidation] =
    useState<EmailValidationState>('idle')
  const [validationMessage, setValidationMessage] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean
    email: Email | null
  }>({ open: false, email: null })
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set())
  const emailInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  // Use external control if provided, otherwise use internal state
  const showAddForm = externalShowAddForm ?? internalShowAddForm
  const setShowAddForm = onShowAddFormChange ?? setInternalShowAddForm

  // Auto-focus the input and scroll into view when the form opens
  useEffect(() => {
    if (showAddForm) {
      // Small delay to ensure the form is rendered
      setTimeout(() => {
        // Scroll form into view
        formRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
        // Focus input
        emailInputRef.current?.focus()
      }, 100)
    }
  }, [showAddForm])

  // Zod-based email validation
  const validateEmail = (
    email: string,
  ): { isValid: boolean; message: string } => {
    if (!email.trim()) {
      return { isValid: false, message: '' }
    }

    // Check if email already exists
    const emailExists = emails.some(
      (e) => e.email.toLowerCase() === email.toLowerCase(),
    )
    if (emailExists) {
      return { isValid: false, message: 'This email address already exists' }
    }

    // Use Zod schema for validation
    const result = emailSchema.safeParse({ email })

    if (result.success) {
      return { isValid: true, message: 'Email address looks good' }
    }

    const error = result.error.issues?.[0]
    return {
      isValid: false,
      message: error?.message || 'Invalid email address',
    }
  }

  // Debounced email validation
  // biome-ignore lint/correctness/useExhaustiveDependencies: validateEmail is used in the timeout
  useEffect(() => {
    if (!newEmail.trim()) {
      setEmailValidation('idle')
      setValidationMessage('')
      return
    }

    setEmailValidation('checking')
    setValidationMessage('Validating email address...')

    const timeoutId = setTimeout(() => {
      const validation = validateEmail(newEmail)
      setEmailValidation(validation.isValid ? 'valid' : 'invalid')
      setValidationMessage(validation.message)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [newEmail, emails])

  const handleAddEmail = async () => {
    if (!newEmail.trim() || emailValidation !== 'valid') return

    setIsAdding(true)
    try {
      await onAddEmail(newEmail.trim())
      // Only close the form after successful completion
      setNewEmail('')
      setShowAddForm(false)
      setEmailValidation('idle')
      setValidationMessage('')
    } catch (error) {
      console.error('Failed to add email:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteClick = (email: Email) => {
    setDeleteConfirmation({ open: true, email })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation.email) return

    const emailId = deleteConfirmation.email.id
    setIsDeleting(emailId)
    setDeleteConfirmation({ open: false, email: null })

    try {
      await onDeleteEmail(emailId)
    } catch (error) {
      console.error('Failed to delete email:', error)
      alert('Failed to delete email. Please try again.')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmation({ open: false, email: null })
  }

  const handleSetPrimary = async (id: string, isPrimary: boolean) => {
    setIsSettingPrimary(id)
    try {
      await onSetPrimary(id, isPrimary)
    } catch (error) {
      console.error(
        `Failed to ${isPrimary ? 'set' : 'unset'} primary email:`,
        error,
      )
      alert(
        `Failed to ${isPrimary ? 'set' : 'unset'} primary email. Please try again.`,
      )
    } finally {
      setIsSettingPrimary(null)
    }
  }

  const handleCancelAdd = () => {
    setNewEmail('')
    setShowAddForm(false)
    setEmailValidation('idle')
    setValidationMessage('')
  }

  const getValidationIcon = () => {
    switch (emailValidation) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'invalid':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'checking':
        return (
          <LoaderCircle className="h-4 w-4 text-muted-foreground animate-spin" />
        )
      default:
        return null
    }
  }

  const getInputBorderColor = () => {
    switch (emailValidation) {
      case 'valid':
        return 'border-green-500 focus-visible:ring-green-500'
      case 'invalid':
        return 'border-red-500 focus-visible:ring-red-500'
      case 'checking':
        return 'border-muted-foreground focus-visible:ring-muted-foreground'
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
      {emails.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Emails</h3>
            <Badge variant="secondary">{emails.length}</Badge>
          </div>
        </div>
      )}

      {/* Updated container with @container query support */}
      <div className="@container">
        <div className="flex flex-col @lg:flex-row @lg:flex-wrap gap-4">
          {/* Add Email Form - Smaller sizing */}
          {showAddForm && (
            <Card
              ref={formRef}
              className="border-dashed border-2 border-primary/20 bg-primary/5 w-full @lg:flex-1 @lg:min-w-[290px] @lg:max-w-[350px]"
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Email Address
                </CardTitle>
                <CardDescription>
                  Enter an email address. It will be verified automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-email">Email Address</Label>
                    <div className="relative">
                      <Input
                        ref={emailInputRef}
                        id="new-email"
                        type="email"
                        placeholder="Enter email address"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (
                            e.key === 'Enter' &&
                            emailValidation === 'valid'
                          ) {
                            handleAddEmail()
                          } else if (e.key === 'Escape') {
                            handleCancelAdd()
                          }
                        }}
                        className={cn(getInputBorderColor())}
                        autoFocus
                      />
                      {getValidationIcon() && (
                        <div className="absolute right-8 top-1/2 -translate-y-1/2">
                          {getValidationIcon()}
                        </div>
                      )}
                    </div>
                    {validationMessage && (
                      <div
                        className={cn(
                          'text-sm flex items-center gap-1',
                          emailValidation === 'valid'
                            ? 'text-green-600'
                            : emailValidation === 'checking'
                              ? 'text-muted-foreground'
                              : 'text-red-600',
                        )}
                      >
                        {getValidationIcon()}
                        {validationMessage}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleAddEmail}
                      disabled={isAdding || emailValidation !== 'valid'}
                      size="sm"
                    >
                      {isAdding ? 'Adding...' : 'Add Email'}
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

          {emails.map((email) => (
            <Card
              key={email.id}
              className={cn(
                'w-full @lg:flex-1 @lg:min-w-[290px] @lg:max-w-[350px]',
                email.isPrimary && 'ring-2 ring-primary',
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between min-w-0 gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex-1 min-w-0">
                      <CopyCell
                        content={email.email}
                        href={`mailto:${email.email}`}
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
                        handleSetPrimary(email.id, !email.isPrimary)
                      }
                      disabled={isSettingPrimary === email.id}
                      title={
                        email.isPrimary ? 'Unset as Primary' : 'Set as Primary'
                      }
                    >
                      <Star
                        className={cn(
                          'h-4 w-4',
                          email.isPrimary && 'fill-current',
                        )}
                      />
                      <span className="sr-only">
                        {email.isPrimary
                          ? 'Unset as Primary'
                          : 'Set as Primary'}
                      </span>
                    </Button>
                    {/* Delete icon */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(email)}
                      disabled={isDeleting === email.id}
                      title="Delete Email"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Wrap everything in Collapsible, but structure layout carefully */}
                  {email.isVerified ? (
                    <Collapsible
                      open={expandedEmails.has(email.id)}
                      onOpenChange={() => {
                        setExpandedEmails((prev) => {
                          const newSet = new Set(prev)
                          if (newSet.has(email.id)) {
                            newSet.delete(email.id)
                          } else {
                            newSet.add(email.id)
                          }
                          return newSet
                        })
                      }}
                    >
                      {/* Trigger row - keeps button on right side */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">Verified</span>
                          {QualityBadge(email)}
                        </div>

                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs flex-shrink-0"
                          >
                            {expandedEmails.has(email.id) ? (
                              <>
                                <ChevronUp className="h-3 w-3 mr-1" />
                                Less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3 mr-1" />
                                More details
                              </>
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>

                      {/* Content appears below the entire row */}
                      <CollapsibleContent className="mt-3 space-y-2 pt-2 border-t">
                        <div className="flex flex-wrap gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              Role-based:
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {email.role ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              Free provider:
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {email.free ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                        </div>

                        {email.source && (
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              Source:
                            </span>
                            <a
                              href={email.source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs truncate text-blue-600 hover:text-blue-800 hover:underline flex-1 min-w-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {(() => {
                                try {
                                  return new URL(email.source).hostname
                                } catch {
                                  return email.source
                                }
                              })()}
                            </a>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Added: {formatDate(email.createdAt)}</span>
                          <span>Updated: {formatDate(email.updatedAt)}</span>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-muted-foreground">
                        Not Verified
                      </span>
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
              Delete Email Address
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this email address? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteConfirmation.email && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium break-all">
                  {deleteConfirmation.email.email}
                </span>
                {deleteConfirmation.email.isPrimary && (
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
              Delete Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
