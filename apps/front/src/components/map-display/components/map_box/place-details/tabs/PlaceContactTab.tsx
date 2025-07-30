import { PhonesList } from '@/components/data-table/columns/utils/PhonesList'
import type { Place } from '@ritchy/types'
import { EmailsList } from '../../../../../data-table/columns/utils/EmailsList'
import { SocialMediaList } from '../../../../../data-table/columns/utils/SocialMediaList'

export const PlaceContactTab = ({ place }: { place: Place }) => {
  const hasEmails = place.emails?.length !== 0
  const hasPhones = place.phones?.length !== 0
  const hasLinkedinSocials = place.linkedinSocials?.length !== 0
  const hasFacebookSocials = place.facebookSocials?.length !== 0
  const hasInstagramSocials = place.instagramSocials?.length !== 0

  if (
    !hasEmails &&
    !hasPhones &&
    !hasLinkedinSocials &&
    !hasFacebookSocials &&
    !hasInstagramSocials
  ) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No contact information available
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-6 p-4">
      {/* Emails section - takes full width due to typically longer content */}
      {hasEmails && (
        <div className="min-w-[200px] flex-1 max-w-[400px]w-full">
          <h3 className="mb-2 text-base font-medium">Emails</h3>
          <EmailsList
            emails={place.emails || []}
            id={`place-${place.id}-emails`}
          />
        </div>
      )}

      {hasPhones && (
        <div className="min-w-[200px] flex-1 max-w-[400px]">
          <h3 className="mb-2 text-base font-medium">Phones</h3>
          <PhonesList
            phones={place.phones || []}
            id={`place-${place.id}-phones`}
          />
        </div>
      )}

      {/* Social media sections - will wrap based on available space */}
      {hasFacebookSocials && (
        <div className="min-w-[200px] flex-1 max-w-[400px]">
          <h3 className="mb-2 text-base font-medium">Facebook</h3>
          <SocialMediaList
            socials={place.facebookSocials || []}
            id={`place-${place.id}-facebook-socials`}
          />
        </div>
      )}

      {hasInstagramSocials && (
        <div className="min-w-[200px] flex-1 max-w-[400px]">
          <h3 className="mb-2 text-base font-medium">Instagram</h3>
          <SocialMediaList
            socials={place.instagramSocials || []}
            id={`place-${place.id}-instagram-socials`}
          />
        </div>
      )}

      {hasLinkedinSocials && (
        <div className="min-w-[200px] flex-1 max-w-[400px]">
          <h3 className="mb-2 text-base font-medium">LinkedIn</h3>
          <SocialMediaList
            socials={place.linkedinSocials || []}
            id={`place-${place.id}-linkedin-socials`}
          />
        </div>
      )}
    </div>
  )
}
