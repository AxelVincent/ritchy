import { PhonesList } from '@/components/data-table/columns/utils/PhonesList'
import type { Place } from '@ritchy/types'
import { EmailsList } from '../../../../../data-table/columns/utils/EmailsList'
import { SocialMediaList } from '../../../../../data-table/columns/utils/SocialMediaList'

export const PlaceContactTab = ({ place }: { place: Place }) => {
  const hasEmails = place.contactEmails?.length !== 0
  const hasPhones = place.contactPhones?.length !== 0
  const hasLinkedinSocials = place.contactLinkedins?.length !== 0
  const hasFacebookSocials = place.contactFacebooks?.length !== 0
  const hasInstagramSocials = place.contactInstagrams?.length !== 0

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
            emails={place.contactEmails || []}
            id={`place-${place.id}-emails`}
          />
        </div>
      )}

      {hasPhones && (
        <div className="min-w-[200px] flex-1 max-w-[400px]">
          <h3 className="mb-2 text-base font-medium">Phones</h3>
          <PhonesList
            phones={place.contactPhones || []}
            id={`place-${place.id}-phones`}
          />
        </div>
      )}

      {/* Social media sections - will wrap based on available space */}
      {hasFacebookSocials && (
        <div className="min-w-[200px] flex-1 max-w-[400px]">
          <h3 className="mb-2 text-base font-medium">Facebook</h3>
          <SocialMediaList
            socials={place.contactFacebooks || []}
            id={`place-${place.id}-facebook-socials`}
          />
        </div>
      )}

      {hasInstagramSocials && (
        <div className="min-w-[200px] flex-1 max-w-[400px]">
          <h3 className="mb-2 text-base font-medium">Instagram</h3>
          <SocialMediaList
            socials={place.contactInstagrams || []}
            id={`place-${place.id}-instagram-socials`}
          />
        </div>
      )}

      {hasLinkedinSocials && (
        <div className="min-w-[200px] flex-1 max-w-[400px]">
          <h3 className="mb-2 text-base font-medium">LinkedIn</h3>
          <SocialMediaList
            socials={place.contactLinkedins || []}
            id={`place-${place.id}-linkedin-socials`}
          />
        </div>
      )}
    </div>
  )
}
