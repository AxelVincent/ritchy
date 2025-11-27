import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import {
  contact,
  contactEmail,
  contactPhone,
  contactSocialMedia,
  enrichmentCompanyOfficer,
  enrichmentCompanyOfficerLinkedin,
} from '../../../db/schema'

export const getContactsByUserPlaceId = async (userPlaceId: string) => {
  // Get all contacts for the userPlaceId
  const contacts = await db
    .select()
    .from(contact)
    .leftJoin(
      enrichmentCompanyOfficer,
      eq(contact.officerId, enrichmentCompanyOfficer.id),
    )
    .where(eq(contact.userPlaceId, userPlaceId))

  if (!contacts || contacts.length === 0) {
    return []
  }

  // Get all related data for each contact
  const contactsWithRelations = await Promise.all(
    contacts.map(async (contactRecord) => {
      const [emails, phones, socials, linkedin] = await Promise.all([
        db
          .select()
          .from(contactEmail)
          .where(eq(contactEmail.contact_id, contactRecord.contact.id)),

        db
          .select()
          .from(contactPhone)
          .where(eq(contactPhone.contactId, contactRecord.contact.id)),

        db
          .select()
          .from(contactSocialMedia)
          .where(eq(contactSocialMedia.contactId, contactRecord.contact.id)),

        contactRecord.contact.officerId
          ? db
              .select()
              .from(enrichmentCompanyOfficerLinkedin)
              .where(
                eq(
                  enrichmentCompanyOfficerLinkedin.officer_id,
                  contactRecord.contact.officerId,
                ),
              )
              .limit(1)
          : Promise.resolve([]),
      ])

      return {
        ...contactRecord,
        emails,
        phones,
        socials,
        linkedin: linkedin[0] ?? null,
      }
    }),
  )

  return contactsWithRelations
}
