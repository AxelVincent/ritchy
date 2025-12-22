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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { faLinkedin } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { Email, Phone, PhoneTypeEnum, SocialMedia } from '@ritchy/types'
import {
  Building2,
  ChevronDown,
  Mail,
  MoreVertical,
  Phone as PhoneIcon,
  ShieldCheck,
  Star,
  Trash2,
  User,
} from 'lucide-react'
import { useState } from 'react'
import { SocialMediaList } from '../data-table/columns/utils/SocialMediaList'
import { ContactEnrichButton } from './ContactEnrichButton'
import { EmailDisplay } from './EmailDisplay'
import { OfficerDetails } from './OfficerDetails'
import {
  PhoneDisplay,
  formatPhoneType,
  getPhoneTypeVariant,
} from './PhoneDisplay'
import { QualityBadge } from './QualityBadge'

interface UnifiedContactCardProps {
  contact: {
    id: string
    firstName: string | null
    lastName: string | null
    type: 'legal' | 'physical' | null
    role: string | null
    isPrimary: boolean
    mention?: string | null
    date_of_appointment?: string | null
    first_name?: string | null
    last_name?: string | null
    gender?: string | null
    date_of_birth?: string | null
    date_of_birth_format?: string | null
    nationality?: string | null
    nationality_code?: string | null
    company_name?: string | null
    company_number?: string | null
    address_line_1?: string | null
    address_line_2?: string | null
    postal_code?: string | null
    city?: string | null
    country?: string | null
    country_code?: string | null
    linkedinUrl?: string | null
    enrichmentStatus?: 'idle' | 'queued' | 'processing' | 'completed' | 'failed'
    emails: Email[]
    phones: Phone[]
    socials: SocialMedia[]
  }
  companyEnriched?: boolean
  isPrimary?: boolean
  isExpanded: boolean
  onToggle: () => void
  onAddEmail: (email: string) => Promise<void>
  onDeleteEmail: (emailId: string) => Promise<void>
  onSetPrimaryEmail: (emailId: string, isPrimary: boolean) => Promise<void>
  onAddPhone: (
    phone: string,
    type: (typeof PhoneTypeEnum.options)[number],
  ) => Promise<void>
  onDeletePhone: (phoneId: string) => Promise<void>
  onSetPrimaryPhone: (phoneId: string, isPrimary: boolean) => Promise<void>
  onSetPrimaryContact?: () => Promise<void>
  onDeleteContact?: () => Promise<void>
}

const SOCIAL_PLATFORMS = ['LINKEDIN', 'FACEBOOK', 'INSTAGRAM'] as const

const getContactIcon = (type: 'legal' | 'physical' | null) => {
  if (type === 'legal') {
    return <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
  }
  return <User className="h-5 w-5 text-muted-foreground flex-shrink-0" />
}

export const UnifiedContactCard = ({
  contact,
  companyEnriched = false,
  isPrimary = false,
  isExpanded,
  onToggle,
  onAddEmail,
  onDeleteEmail,
  onSetPrimaryEmail,
  onAddPhone,
  onDeletePhone,
  onSetPrimaryPhone,
  onSetPrimaryContact,
  onDeleteContact,
}: UnifiedContactCardProps) => {
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [showPhoneForm, setShowPhoneForm] = useState(false)
  const [isSettingPrimary, setIsSettingPrimary] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleAddEmailClick = () => {
    if (!isExpanded) {
      onToggle()
    }
    setShowEmailForm(true)
    setShowPhoneForm(false)
  }

  const handleAddPhoneClick = () => {
    if (!isExpanded) {
      onToggle()
    }
    setShowPhoneForm(true)
    setShowEmailForm(false)
  }

  const handleSetPrimaryContact = async () => {
    if (!onSetPrimaryContact) return
    setIsSettingPrimary(true)
    try {
      await onSetPrimaryContact()
    } catch (error) {
      console.error('Failed to set primary contact:', error)
      alert('Failed to set primary contact. Please try again.')
    } finally {
      setIsSettingPrimary(false)
    }
  }

  const handleDeleteContact = async () => {
    if (!onDeleteContact) return
    setIsDeleting(true)
    try {
      await onDeleteContact()
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Failed to delete contact:', error)
      // Error is shown via toast in the parent
    } finally {
      setIsDeleting(false)
    }
  }

  const displayName =
    contact.firstName || contact.lastName
      ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
      : 'Contact'

  // Get primary email and phone for collapsed view
  const primaryEmail =
    contact.emails.find((e) => e.isPrimary) || contact.emails[0]
  const primaryPhone =
    contact.phones.find((p) => p.isPrimary) || contact.phones[0]
  const hasLinkedIn = !!contact.linkedinUrl

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card
        className={
          isPrimary
            ? 'border-l-4 border-l-primary border-t border-r border-b shadow-sm hover:shadow-lg transition-all duration-200 bg-primary/5'
            : 'border shadow-sm hover:shadow-lg transition-all duration-200 hover:border-border/80'
        }
        aria-label={`Contact card for ${displayName}`}
      >
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-w-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {getContactIcon(contact.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle
                    className="text-base sm:text-lg font-semibold tracking-tight truncate"
                    id={`contact-name-${contact.id}`}
                  >
                    {displayName}
                  </CardTitle>
                  {contact.role && (
                    <Badge
                      variant="secondary"
                      className="flex-shrink-0 text-xs font-normal"
                      aria-label={`Role: ${contact.role}`}
                    >
                      {contact.role}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-2">
                {isPrimary && (
                  <div className="flex items-center pl-2 pr-2">
                    <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                  </div>
                )}
                {contact.type !== 'legal' && (
                  <ContactEnrichButton
                    contactId={contact.id}
                    companyEnriched={companyEnriched}
                  />
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Contact actions"
                      title="More actions"
                    >
                      <MoreVertical className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">More actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleAddEmailClick}>
                      <Mail className="h-4 w-4 mr-2" />
                      Add Email
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleAddPhoneClick}>
                      <PhoneIcon className="h-4 w-4 mr-2" />
                      Add Phone
                    </DropdownMenuItem>
                    {!isPrimary && (onSetPrimaryContact || onDeleteContact) && (
                      <DropdownMenuSeparator />
                    )}
                    {!isPrimary && onSetPrimaryContact && (
                      <DropdownMenuItem
                        onClick={handleSetPrimaryContact}
                        disabled={isSettingPrimary}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Set as Primary
                      </DropdownMenuItem>
                    )}
                    {!isPrimary && onDeleteContact && (
                      <>
                        {onSetPrimaryContact && <DropdownMenuSeparator />}
                        <DropdownMenuItem
                          onClick={() => setShowDeleteDialog(true)}
                          disabled={isDeleting}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Contact
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0"
                    aria-expanded={isExpanded}
                    aria-controls={`contact-details-${contact.id}`}
                    aria-label={
                      isExpanded
                        ? 'Collapse contact details'
                        : 'Expand contact details'
                    }
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                    <span className="sr-only">
                      {isExpanded ? 'Collapse' : 'Expand'} contact details
                    </span>
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </div>
          <CardDescription
            className="flex items-center gap-2 text-sm flex-wrap"
            aria-label={`Contact has ${contact.emails.length} emails, ${contact.phones.length} phone numbers, and ${contact.socials.length + (hasLinkedIn ? 1 : 0)} social media accounts`}
          >
            {contact.emails.length > 0 && (
              <span>
                {contact.emails.length} email
                {contact.emails.length !== 1 ? 's' : ''}
              </span>
            )}
            {contact.emails.length > 0 && contact.phones.length > 0 && (
              <span className="text-muted-foreground/50">•</span>
            )}
            {contact.phones.length > 0 && (
              <span>
                {contact.phones.length} phone
                {contact.phones.length !== 1 ? 's' : ''}
              </span>
            )}
            {(contact.emails.length > 0 || contact.phones.length > 0) &&
              (contact.socials.length > 0 || hasLinkedIn) && (
                <span className="text-muted-foreground/50">•</span>
              )}
            {(contact.socials.length > 0 || hasLinkedIn) && (
              <span>
                {contact.socials.length + (hasLinkedIn ? 1 : 0)} social
                {contact.socials.length + (hasLinkedIn ? 1 : 0) !== 1
                  ? 's'
                  : ''}
              </span>
            )}
          </CardDescription>
        </CardHeader>

        {/* Collapsed View: Show primary email, phone & LinkedIn for quick access */}
        {!isExpanded && (primaryEmail || primaryPhone || hasLinkedIn) && (
          <CardContent className="pt-0 pb-4">
            <div className="@container">
              <div className="flex flex-col gap-2">
                {primaryEmail && (
                  <div className="flex items-center gap-2 w-full min-w-0 overflow-hidden">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="min-w-40 flex-1 overflow-hidden">
                      <CopyCell
                        content={primaryEmail.email}
                        href={`mailto:${primaryEmail.email}`}
                      />
                    </span>
                    {primaryEmail.isVerified && (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5 text-green-500 shrink-0 @xs:shrink" />
                        <span className="shrink-0 @xs:shrink">
                          {QualityBadge(primaryEmail)}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {primaryPhone && (
                  <div className="flex items-center gap-2 w-full min-w-0 overflow-hidden">
                    <PhoneIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="min-w-40 flex-1 overflow-hidden">
                      <CopyCell
                        content={primaryPhone.phone}
                        href={`tel:${primaryPhone.phone}`}
                      />
                    </span>
                    {primaryPhone.type && (
                      <Badge
                        variant={getPhoneTypeVariant(primaryPhone.type)}
                        className="text-xs shrink-0 truncate @xs:shrink"
                      >
                        {formatPhoneType(primaryPhone.type)}
                      </Badge>
                    )}
                  </div>
                )}

                {hasLinkedIn && contact.linkedinUrl && (
                  <div className="flex items-center gap-2 w-full min-w-0 overflow-hidden">
                    <FontAwesomeIcon
                      icon={faLinkedin}
                      className="h-4 w-4 text-blue-600 flex-shrink-0"
                    />
                    <span className="min-w-40 flex-1 overflow-hidden">
                      <CopyCell
                        content={(() => {
                          try {
                            const url = new URL(contact.linkedinUrl)
                            const path = url.pathname.replace(/^\/+|\/+$/g, '')
                            return path || contact.linkedinUrl
                          } catch {
                            return contact.linkedinUrl
                          }
                        })()}
                        href={contact.linkedinUrl}
                      />
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        )}

        <CollapsibleContent
          id={`contact-details-${contact.id}`}
          className="transition-all duration-200"
        >
          <CardContent
            className="space-y-4 pt-0"
            aria-labelledby={`contact-name-${contact.id}`}
          >
            <EmailDisplay
              emails={contact.emails}
              onAddEmail={onAddEmail}
              onDeleteEmail={onDeleteEmail}
              onSetPrimary={onSetPrimaryEmail}
              showAddForm={showEmailForm}
              onShowAddFormChange={setShowEmailForm}
            />

            <PhoneDisplay
              phones={contact.phones}
              onAddPhone={onAddPhone}
              onDeletePhone={onDeletePhone}
              onSetPrimary={onSetPrimaryPhone}
              showAddForm={showPhoneForm}
              onShowAddFormChange={setShowPhoneForm}
            />

            {/* LinkedIn URL */}
            {contact.linkedinUrl && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon
                    icon={faLinkedin}
                    className="h-5 w-5 text-blue-600"
                  />
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    LinkedIn Profile
                  </h3>
                </div>
                <Card className="w-full">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex-1 min-w-0">
                        <CopyCell
                          content={(() => {
                            try {
                              const url = new URL(contact.linkedinUrl)
                              const path = url.pathname.replace(
                                /^\/+|\/+$/g,
                                '',
                              )
                              return path || contact.linkedinUrl
                            } catch {
                              return contact.linkedinUrl
                            }
                          })()}
                          href={contact.linkedinUrl}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Socials */}
            {contact.socials.length > 0 && (
              <div className="space-y-4">
                {SOCIAL_PLATFORMS.map((platform) => {
                  const filtered = contact.socials.filter(
                    (s) => s.socialMediaPlatform === platform,
                  )
                  return filtered.length > 0 ? (
                    <SocialMediaList
                      key={platform}
                      socials={filtered}
                      platform={platform}
                    />
                  ) : null
                })}
              </div>
            )}

            {/* Separator before officer details */}
            {contact.role &&
              (contact.emails.length > 0 ||
                contact.phones.length > 0 ||
                contact.socials.length > 0) && <Separator />}

            {/* Officer Details - Secondary Information */}
            {contact.role && (
              <OfficerDetails
                role={contact.role}
                mention={contact.mention}
                dateOfAppointment={contact.date_of_appointment}
                firstName={contact.first_name}
                lastName={contact.last_name}
                gender={contact.gender}
                dateOfBirth={contact.date_of_birth}
                dateOfBirthFormat={contact.date_of_birth_format}
                nationality={contact.nationality}
                nationalityCode={contact.nationality_code}
                companyName={contact.company_name}
                companyNumber={contact.company_number}
                addressLine1={contact.address_line_1}
                addressLine2={contact.address_line_2}
                postalCode={contact.postal_code}
                city={contact.city}
                country={contact.country}
                countryCode={contact.country_code}
              />
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {displayName}? This will
              permanently remove:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>{contact.emails.length} email address(es)</li>
              <li>{contact.phones.length} phone number(s)</li>
              <li>{contact.socials.length} social media profile(s)</li>
            </ul>
            <p className="text-sm font-medium text-destructive mt-4">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteContact}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Collapsible>
  )
}
