import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { Email } from '@ritchy/types'
import {
  AlertCircle,
  CheckCircle,
  LoaderCircle,
  Mail,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Star,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { QualityBadge } from './QualityBadge'

interface EmailDisplayProps {
  emails: Email[]
  onAddEmail: (email: string) => Promise<void>
  onDeleteEmail: (id: string) => Promise<void>
  onSetPrimary: (id: string) => Promise<void>
  className?: string
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
  // onDeleteEmail,
  // onSetPrimary,
  className,
}: EmailDisplayProps) => {
  console.log(emails)
  const [newEmail, setNewEmail] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  // const [isDeleting, setIsDeleting] = useState<string | null>(null)
  // const [isSettingPrimary, setIsSettingPrimary] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [emailValidation, setEmailValidation] =
    useState<EmailValidationState>('idle')
  const [validationMessage, setValidationMessage] = useState('')

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

    const error = result.error.errors?.[0]
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

  // const handleDeleteEmail = async (id: string) => {
  //   setIsDeleting(id)
  //   try {
  //     await onDeleteEmail(id)
  //   } catch (error) {
  //     console.error('Failed to delete email:', error)
  //   } finally {
  //     setIsDeleting(null)
  //   }
  // }

  // const handleSetPrimary = async (id: string) => {
  //   setIsSettingPrimary(id)
  //   try {
  //     await onSetPrimary(id)
  //   } catch (error) {
  //     console.error('Failed to set primary email:', error)
  //   } finally {
  //     setIsSettingPrimary(null)
  //   }
  // }

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Emails</h3>
          <Badge variant="secondary">{emails.length}</Badge>
        </div>
        {!showAddForm && (
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4" />
            Add Email
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        {/* Add Email Form */}
        {showAddForm && (
          <Card className="border-dashed border-2 border-primary/20 bg-primary/5 flex-1 min-w-[300px] max-w-lg">
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
                      id="new-email"
                      type="email"
                      placeholder="Enter email address"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && emailValidation === 'valid') {
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
              'flex-1 min-w-[300px] max-w-lg',
              email.isPrimary && 'ring-2 ring-primary',
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{email.email}</span>
                  </div>
                  {email.isPrimary && (
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-current" />
                      <Badge variant="outline">Primary</Badge>
                    </div>
                  )}
                </div>
                {/* <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!email.isPrimary && (
                      <DropdownMenuItem
                        onClick={() => handleSetPrimary(email.id)}
                        disabled={isSettingPrimary === email.id}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        {isSettingPrimary === email.id
                          ? 'Setting...'
                          : 'Set as Primary'}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDeleteEmail(email.id)}
                      disabled={isDeleting === email.id}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isDeleting === email.id ? 'Deleting...' : 'Delete'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu> */}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Verification Status */}
                <div className="flex items-center gap-2">
                  {email.isVerified ? (
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Verified</span>
                      {QualityBadge(email)}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-muted-foreground">
                        Not Verified
                      </span>
                    </div>
                  )}
                </div>

                {/* Verification Details */}
                {email.isVerified && (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-row gap-2">
                      <div className="flex items-center  gap-2">
                        <span className="text-sm text-muted-foreground">
                          Role:
                        </span>
                        <Badge variant="outline">
                          {email.role ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Free:
                        </span>
                        <Badge variant="outline">
                          {email.free ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-row gap-2">
                      {email.source && (
                        <div className="flex items-center gap-2 max-w-[300px]">
                          <span className="text-sm text-muted-foreground">
                            Source:
                          </span>
                          <a
                            href={email.source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm truncate"
                          >
                            {new URL(email.source).toString()}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Created: {formatDate(email.createdAt)}</span>
                  <span>Updated: {formatDate(email.updatedAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
