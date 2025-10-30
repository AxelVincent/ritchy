import { Badge } from '@/components/ui/badge'
import {
  faFacebook,
  faInstagram,
  faLinkedin,
} from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { SocialMedia, SocialMediaPlatform } from '@ritchy/types'
import { Star } from 'lucide-react'
import React from 'react'
import { CopyCell } from './ColumnCells'

const getSocialMediaIcon = (platform: SocialMediaPlatform) => {
  switch (platform) {
    case 'LINKEDIN':
      return faLinkedin
    case 'FACEBOOK':
      return faFacebook
    case 'INSTAGRAM':
      return faInstagram
    default:
      return faLinkedin
  }
}

const getPlatformTitle = (platform: SocialMediaPlatform) => {
  switch (platform) {
    case 'LINKEDIN':
      return 'LinkedIn'
    case 'FACEBOOK':
      return 'Facebook'
    case 'INSTAGRAM':
      return 'Instagram'
    default:
      return 'Socials'
  }
}

export const SocialMediaList = React.memo(function SocialMediaList({
  socials,
  platform,
}: {
  socials: SocialMedia[]
  platform?: SocialMediaPlatform
}) {
  // Determine the platform from the first social media item if not provided
  const effectivePlatform =
    platform || socials[0]?.socialMediaPlatform || 'LINKEDIN'
  const platformIcon = getSocialMediaIcon(effectivePlatform)
  const platformTitle = getPlatformTitle(effectivePlatform)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <FontAwesomeIcon
          icon={platformIcon}
          className="h-5 w-5 text-muted-foreground"
        />
        <h3 className="text-sm font-semibold">{platformTitle}</h3>
        <Badge variant="secondary">{socials.length}</Badge>
      </div>
      {socials.map((social) => (
        <div key={social.url} className="flex items-center gap-2 p-2 min-w-0">
          <div className="flex-1 min-w-0">
            <CopyCell content={social.url} href={social.url} />
          </div>
          {social.isPrimary && (
            <Star
              className="h-4 w-4 flex-shrink-0 text-yellow-400"
              fill="currentColor"
              aria-label="Primary social media"
            />
          )}
        </div>
      ))}
    </div>
  )
})
