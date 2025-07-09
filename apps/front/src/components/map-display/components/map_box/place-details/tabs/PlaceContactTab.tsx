'use client'

import {
  ColumnPinCopyCell,
  ContactEmailCell,
} from '@/components/data-table/columns/utils/ColumnCells'
import { Badge } from '@/components/ui/badge'
import type { Place } from '@ritchy/types'
import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  Smartphone,
  Twitter,
} from 'lucide-react'
import { useMemo } from 'react'

export const PlaceContactTab = ({ place }: { place: Place }) => {
  const getSocialIcon = (platform: string) => {
    const url = platform.toLowerCase()
    if (url.includes('linkedin')) return <Linkedin className="h-4 w-4" />
    if (url.includes('facebook')) return <Facebook className="h-4 w-4" />
    if (url.includes('instagram')) return <Instagram className="h-4 w-4" />
    if (url.includes('twitter') || url.includes('x.com'))
      return <Twitter className="h-4 w-4" />
    return <Linkedin className="h-4 w-4" />
  }

  const renderEmailSection = () => {
    const allEmails = [
      ...(place.primaryEmail ? [place.primaryEmail] : []),
      ...(place.secondaryEmails || []),
    ]

    return (
      <div className="grid grid-cols-2 gap-4">
        {allEmails.map((email, index) => (
          <div
            key={`${place.id}-email-${index}`}
            className="flex items-center gap-3 p-3 hover:bg-muted/30 rounded-lg border border-border"
          >
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <ContactEmailCell id={place.id} content={email} />
            </div>
            {email === place.primaryEmail && (
              <Badge variant="default" className="text-xs">
                Primary
              </Badge>
            )}
          </div>
        ))}
      </div>
    )
  }

  // helper function to create social entries, the isPrimary is handled in the map function
  const createSocialEntries = (
    primaryField: string | null,
    secondaryField: string[] | null,
    platform: string,
  ) => {
    const entries = []
    if (primaryField) {
      entries.push({ url: primaryField, platform, isPrimary: true })
    }
    if (secondaryField) {
      entries.push(
        ...secondaryField.map((url) => ({ url, platform, isPrimary: false })),
      )
    }
    return entries
  }

  const renderSocialSection = () => {
    const allSocials = [
      ...createSocialEntries(
        place.primaryLinkedinSocial,
        place.secondaryLinkedinSocials,
        'LinkedIn',
      ),
      ...createSocialEntries(
        place.primaryFacebookSocial,
        place.secondaryFacebookSocials,
        'Facebook',
      ),
      ...createSocialEntries(
        place.primaryInstagramSocial,
        place.secondaryInstagramSocials,
        'Instagram',
      ),
      ...createSocialEntries(
        place.primaryTwitterSocial,
        place.secondaryTwitterSocials,
        'Twitter',
      ),
    ]

    return (
      <div className="grid grid-cols-2 gap-4">
        {allSocials.map((social, index) => (
          <div
            key={`${place.id}-social-${index}`}
            className="flex items-center gap-2 p-3 hover:bg-muted/30 rounded-lg border border-border"
          >
            {getSocialIcon(social.url)}
            <div className="flex-1 min-w-0">
              <ColumnPinCopyCell
                id={place.id}
                content={social.url}
                href={social.url}
              />
            </div>
            {social.isPrimary && (
              <Badge variant="default" className="text-xs shrink-0">
                Primary
              </Badge>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderEmptyState = (type: 'emails' | 'socials') => (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="text-muted-foreground mb-2">
        {type === 'emails' ? (
          <Mail className="h-5 w-5" />
        ) : (
          <Smartphone className="h-5 w-5" />
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-3">No {type} available</p>
      <p className="text-xs text-muted-foreground">
        Try the Enrich All button to add more {type}
      </p>
    </div>
  )

  const hasEmails =
    place.primaryEmail ||
    (place.secondaryEmails && place.secondaryEmails.length > 0)

  const hasSocials = useMemo(() => {
    return (
      place.primaryLinkedinSocial ||
      place.primaryFacebookSocial ||
      place.primaryInstagramSocial ||
      place.primaryTwitterSocial
    )
  }, [place])

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-6">
        {/* Emails Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5" />
            <h3 className="font-medium text-sm">Email Addresses</h3>
            {hasEmails && (
              <Badge variant="secondary" className="text-xs">
                {(place.primaryEmail ? 1 : 0) +
                  (place.secondaryEmails?.length || 0)}
              </Badge>
            )}
          </div>
          <div>
            {!hasEmails ? renderEmptyState('emails') : renderEmailSection()}
          </div>
        </div>

        {/* Socials Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5" />
            <h3 className="font-medium text-sm">Social Medias</h3>
            {hasSocials && (
              <Badge variant="secondary" className="text-xs">
                {
                  [
                    place.primaryLinkedinSocial,
                    place.primaryFacebookSocial,
                    place.primaryInstagramSocial,
                    place.primaryTwitterSocial,
                  ].filter(Boolean).length
                }
              </Badge>
            )}
          </div>
          <div>
            {!hasSocials ? renderEmptyState('socials') : renderSocialSection()}
          </div>
        </div>
      </div>
    </div>
  )
}
