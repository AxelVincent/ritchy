import { logger } from '@ritchy/logger'
import { enqueueContactoutPeopleSearchJob } from '../../../../../../internal/bullmq/jobs/contactout/people_search/queue'
import type { InsertOfficerPhoneData } from '../../../queries/insert_enrichment_company_officer_phones'

export const enrichWithContactOutPhone = async (
  officerId: string,
  firstName: string,
  lastName: string,
): Promise<InsertOfficerPhoneData[]> => {
  const fullName = `${firstName} ${lastName}`.trim()
  const contactoutResult = await enqueueContactoutPeopleSearchJob({
    name: fullName,
    revealInfo: true, // Need to reveal info to get phone numbers
    page: 1,
  })

  if (
    contactoutResult.status_code === 200 &&
    contactoutResult.profiles &&
    Object.keys(contactoutResult.profiles).length > 0
  ) {
    // Extract phone numbers from ContactOut profiles
    const contactoutPhones: string[] = []
    for (const profile of Object.values(contactoutResult.profiles)) {
      if (profile.contact_info?.phones) {
        contactoutPhones.push(...profile.contact_info.phones)
      }
    }

    if (contactoutPhones.length > 0) {
      logger.info({
        msg: '[phone_waterfall] Phones found via ContactOut',
        event: 'phones_found_contactout',
        metadata: {
          officerId,
          phoneCount: contactoutPhones.length,
          phones: contactoutPhones,
        },
      })

      return contactoutPhones.map((phone) => ({
        officer_id: officerId,
        phone,
        source: 'contactout',
      }))
    }

    logger.info({
      msg: '[phone_waterfall] ContactOut found profiles but no phones, trying next provider',
      event: 'contactout_no_phones',
      metadata: {
        officerId,
      },
    })
  } else {
    logger.info({
      msg: '[phone_waterfall] No profiles found via ContactOut, trying next provider',
      event: 'contactout_no_profiles_for_phone',
      metadata: {
        officerId,
        statusCode: contactoutResult.status_code,
      },
    })
  }

  return []
}
