import { CopyCell } from '@/components/data-table/columns/utils/ColumnCells'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Email, Phone, PhoneTypeEnum, SocialMedia } from '@ritchy/types'
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone as PhoneIcon,
  ShieldCheck,
  Star,
  User,
} from 'lucide-react'
import { useState } from 'react'
import { SocialMediaList } from '../data-table/columns/utils/SocialMediaList'
import { ContactActions } from './ContactActions'
import { EmailDisplay } from './EmailDisplay'
import { OfficerDetails } from './OfficerDetails'
import {
  PhoneDisplay,
  formatPhoneType,
  getPhoneTypeVariant,
} from './PhoneDisplay'
import { QualityBadge } from './QualityBadge'

interface PrimaryContactCardProps {
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
    emails: Email[]
    phones: Phone[]
    socials: SocialMedia[]
  }
  onViewDetails: () => void
  isExpanded?: boolean
  onAddEmail: (email: string) => Promise<void>
  onDeleteEmail: (emailId: string) => Promise<void>
  onSetPrimaryEmail: (emailId: string, isPrimary: boolean) => Promise<void>
  onAddPhone: (
    phone: string,
    type: (typeof PhoneTypeEnum.options)[number],
  ) => Promise<void>
  onDeletePhone: (phoneId: string) => Promise<void>
  onSetPrimaryPhone: (phoneId: string, isPrimary: boolean) => Promise<void>
}

const SOCIAL_PLATFORMS = ['LINKEDIN', 'FACEBOOK', 'INSTAGRAM'] as const

const getContactIcon = (type: 'legal' | 'physical' | null) => {
  if (type === 'legal') {
    return <Building2 className="h-6 w-6 text-muted-foreground flex-shrink-0" />
  }
  return <User className="h-6 w-6 text-muted-foreground flex-shrink-0" />
}

export const PrimaryContactCard = ({
  contact,
  onViewDetails,
  isExpanded = false,
  onAddEmail,
  onDeleteEmail,
  onSetPrimaryEmail,
  onAddPhone,
  onDeletePhone,
  onSetPrimaryPhone,
}: PrimaryContactCardProps) => {
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [showPhoneForm, setShowPhoneForm] = useState(false)

  const primaryEmail =
    contact.emails.find((e) => e.isPrimary) || contact.emails[0]
  const primaryPhone =
    contact.phones.find((p) => p.isPrimary) || contact.phones[0]

  const displayName =
    contact.firstName || contact.lastName
      ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
      : 'Primary Contact'

  const handleAddEmailClick = () => {
    if (!isExpanded) {
      onViewDetails()
    }
    setShowEmailForm(true)
    setShowPhoneForm(false)
  }

  const handleAddPhoneClick = () => {
    if (!isExpanded) {
      onViewDetails()
    }
    setShowPhoneForm(true)
    setShowEmailForm(false)
  }

  return (
    <Card className="border-2 border-primary/50 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {getContactIcon(contact.type)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-primary text-primary" />
                <CardTitle className="text-xl">{displayName}</CardTitle>
                {contact.role && (
                  <Badge variant="secondary" className="mr-2">
                    {contact.role}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ContactActions
              onAddEmail={handleAddEmailClick}
              onAddPhone={handleAddPhoneClick}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isExpanded ? (
          <>
            {/* Collapsed View - Show Primary Email & Phone */}
            {primaryEmail && (
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex flex-row items-center gap-2 min-w-0">
                  <CopyCell
                    content={primaryEmail.email}
                    href={`mailto:${primaryEmail.email}`}
                  />
                  {primaryEmail.isVerified && (
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Verified</span>
                      {QualityBadge(primaryEmail)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {primaryPhone && (
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                <PhoneIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex flex-row items-center gap-2 min-w-0">
                  <CopyCell
                    content={primaryPhone.phone}
                    href={`tel:${primaryPhone.phone}`}
                  />
                  {primaryPhone.type && (
                    <div className="flex items-center gap-2">
                      <Badge variant={getPhoneTypeVariant(primaryPhone.type)}>
                        {formatPhoneType(primaryPhone.type)}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional Contact Counts & Toggle Button */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{contact.emails.length} email(s)</span>
                <span>{contact.phones.length} phone(s)</span>
                <span>{contact.socials.length} social(s)</span>
              </div>
              <Button variant="outline" size="sm" onClick={onViewDetails}>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show Details
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Expanded View - Show Full Details */}
            <div className="space-y-6">
              {/* Officer Details */}
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

              {/* Separator if officer details exist */}
              {contact.role && <Separator />}

              {/* Emails */}
              <EmailDisplay
                emails={contact.emails}
                onAddEmail={onAddEmail}
                onDeleteEmail={onDeleteEmail}
                onSetPrimary={onSetPrimaryEmail}
                showAddForm={showEmailForm}
                onShowAddFormChange={setShowEmailForm}
              />

              {/* Phones */}
              <PhoneDisplay
                phones={contact.phones}
                onAddPhone={onAddPhone}
                onDeletePhone={onDeletePhone}
                onSetPrimary={onSetPrimaryPhone}
                showAddForm={showPhoneForm}
                onShowAddFormChange={setShowPhoneForm}
              />

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

              {/* Collapse Button */}
              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={onViewDetails}>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Hide Details
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
