import { usePostContactEmail } from '@/api/mutations/contacts/usePostContactEmail'
import { EmailDisplay } from '@/components/contact/EmailDisplay'
import { PhonesList } from '@/components/data-table/columns/utils/PhonesList'
import { SocialMediaList } from '@/components/data-table/columns/utils/SocialMediaList'
import type { Place } from '@ritchy/types'
import { EMPTY_MESSAGE } from '../SelectedPlaceCard'

export const PlaceContactTab = ({ place }: { place: Place }) => {
  const hasPhones = place.contactPhones?.length !== 0
  const hasLinkedinSocials = place.contactLinkedins?.length !== 0
  const hasFacebookSocials = place.contactFacebooks?.length !== 0
  const hasInstagramSocials = place.contactInstagrams?.length !== 0

  const postContactEmailMutation = usePostContactEmail()

  const handleAddEmail = async (email: string) => {
    await postContactEmailMutation.mutateAsync({
      userPlaceId: place.id,
      email,
    })
  }

  const hasOtherContact =
    hasPhones || hasLinkedinSocials || hasFacebookSocials || hasInstagramSocials

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Emails section - always show to allow adding emails */}
      <div className="min-w-[350px] flex-1 max-w-[400px]w-full">
        <EmailDisplay
          emails={place.contactEmails || []}
          onAddEmail={handleAddEmail}
          onDeleteEmail={async () => {}}
          onSetPrimary={async () => {}}
        />
      </div>

      {/* Show enrichment message for other contact types when missing */}
      {!hasOtherContact && place.website && (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-sm space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-muted-foreground">
                Enrichment required for contact information
              </h3>
              <p className="text-sm text-muted-foreground">{EMPTY_MESSAGE}</p>
            </div>
          </div>
        </div>
      )}

      {hasPhones && (
        <div className="min-w-[200px] flex-1 max-w-[400px]">
          <PhonesList
            phones={place.contactPhones || []}
            id={`place-${place.id}-phones`}
          />
        </div>
      )}

      {/* Social media sections - will wrap based on available space */}
      {hasFacebookSocials && (
        <div className="min-w-[200px] flex-1 max-w-[400px]">
          <SocialMediaList
            socials={place.contactFacebooks || []}
            platform="FACEBOOK"
          />
        </div>
      )}

      {hasInstagramSocials && (
        <div className="min-w-[200px] flex-1 max-w-[400px]">
          <SocialMediaList
            socials={place.contactInstagrams || []}
            platform="INSTAGRAM"
          />
        </div>
      )}

      {hasLinkedinSocials && (
        <div className="min-w-[200px] flex-1 max-w-[400px]">
          <SocialMediaList
            socials={place.contactLinkedins || []}
            platform="LINKEDIN"
          />
        </div>
      )}
    </div>
  )
}
