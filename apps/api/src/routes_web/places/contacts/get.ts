import { logger } from '@ritchy/logger'
import type {
  GetPlacesContactsApiResponse,
  GetPlacesContactsParams,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { getContactsByUserPlaceId } from '../../../services/contact/queries/get_contacts_by_user_place_id'

export const getPlacesContacts = async (
  req: Request<GetPlacesContactsParams>,
  res: Response<GetPlacesContactsApiResponse>,
) => {
  const { userPlaceId } = req.params

  logger.info({
    msg: 'Contacts endpoint called',
    event: 'contacts_endpoint_called',
    metadata: { userPlaceId },
  })

  try {
    const contacts = await getContactsByUserPlaceId(userPlaceId)

    logger.info({
      msg: 'Contacts retrieved',
      event: 'contacts_retrieved',
      metadata: { userPlaceId, contactCount: contacts.length },
    })

    res.json({
      contacts: contacts.map((contact) => ({
        id: contact.contact.id,
        userPlaceId: contact.contact.userPlaceId,
        firstName: contact.contact.firstName,
        lastName: contact.contact.lastName,
        isPrimary: contact.contact.isPrimary,
        type: contact.contact.type,
        role: contact.enrichment_company_officer?.role ?? null,
        mention: contact.enrichment_company_officer?.mention ?? null,
        date_of_appointment:
          contact.enrichment_company_officer?.date_of_appointment?.toISOString() ??
          null,
        last_name: contact.enrichment_company_officer?.last_name ?? null,
        first_name: contact.enrichment_company_officer?.first_name ?? null,
        gender: contact.enrichment_company_officer?.gender ?? null,
        date_of_birth:
          contact.enrichment_company_officer?.date_of_birth?.toISOString() ??
          null,
        date_of_birth_format:
          contact.enrichment_company_officer?.date_of_birth_format ?? null,
        nationality: contact.enrichment_company_officer?.nationality ?? null,
        nationality_code:
          contact.enrichment_company_officer?.nationality_code ?? null,
        company_name: contact.enrichment_company_officer?.company_name ?? null,
        company_number:
          contact.enrichment_company_officer?.company_number ?? null,
        address_line_1:
          contact.enrichment_company_officer?.address_line_1 ?? null,
        address_line_2:
          contact.enrichment_company_officer?.address_line_2 ?? null,
        postal_code: contact.enrichment_company_officer?.postal_code ?? null,
        city: contact.enrichment_company_officer?.city ?? null,
        country: contact.enrichment_company_officer?.country ?? null,
        country_code: contact.enrichment_company_officer?.country_code ?? null,
        emails: contact.emails.map((email) => ({
          id: email.id,
          contactId: email.contact_id,
          email: email.email,
          isPrimary: email.is_primary,
          isVerified: email.is_verified,
          source: email.source,
          quality: email.quality,
          result: email.result,
          role: email.role,
          free: email.free,
          createdAt: email.created_at.toISOString(),
          updatedAt: email.updated_at.toISOString(),
        })),
        phones: contact.phones.map((phone) => ({
          id: phone.id,
          contactId: phone.contactId,
          phone: phone.phone,
          type: phone.type,
          isPrimary: phone.isPrimary,
          createdAt: phone.createdAt.toISOString(),
          updatedAt: phone.updatedAt.toISOString(),
        })),
        socials: contact.socials.map((social) => ({
          id: social.id,
          contactId: social.contactId,
          platform: social.socialMediaPlatform,
          url: social.url,
          isPrimary: social.isPrimary,
          createdAt: social.createdAt.toISOString(),
          updatedAt: social.updatedAt.toISOString(),
        })),
        linkedinUrl: contact.linkedin?.profile_url ?? null,
        enrichmentStatus: contact.contact.enrichmentStatus ?? 'idle',
        enrichedAt: contact.contact.enrichedAt?.toISOString() ?? null,
        createdAt: contact.contact.createdAt.toISOString(),
        updatedAt: contact.contact.updatedAt.toISOString(),
      })),
    })
  } catch (error) {
    logger.error({
      msg: 'Failed to get contacts data',
      event: 'get_contacts_data_error',
      metadata: { error, userPlaceId },
    })
    res.status(500).json({ error: 'Internal server error' })
  }
}
