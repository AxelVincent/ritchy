import type { SocialMedia } from '@ritchy/types'
import { Star } from 'lucide-react'
import React from 'react'
import { ContactSocialCell } from './ColumnCells'

export const SocialMediaList = React.memo(function SocialMediaList({
  socials,
  id,
}: {
  socials: SocialMedia[]
  id: string
}) {
  return (
    <div className="space-y-2">
      {socials.map((social, index) => (
        <div key={social.url} className="flex items-center justify-between p-2">
          <ContactSocialCell
            id={`${id}-${index}`}
            content={social.url}
            socialType={social.socialMediaPlatform}
            isPin={false}
          />
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
