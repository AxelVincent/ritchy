import {
  contact,
  contactEmail,
  contactPhone,
  contactSocialMedia,
} from '../../../db/schema'
import { getTestDb } from '../setup/test-database'

export interface ContactData {
  firstName?: string
  lastName?: string
  type?: 'physical' | 'legal'
  email?: string
  phone?: string
  linkedin?: string
  instagram?: string
  facebook?: string
}

export const seedContact = async (userPlaceId: string, data: ContactData) => {
  const db = getTestDb()
  const contactId = crypto.randomUUID()

  await db.insert(contact).values({
    id: contactId,
    userPlaceId: userPlaceId,
    firstName: data.firstName ?? 'Test',
    lastName: data.lastName ?? 'Contact',
    type: data.type ?? 'physical',
    isPrimary: true,
  })

  if (data.email) {
    await db.insert(contactEmail).values({
      id: crypto.randomUUID(),
      contact_id: contactId,
      email: data.email,
      is_primary: true,
    })
  }

  if (data.phone) {
    await db.insert(contactPhone).values({
      id: crypto.randomUUID(),
      contactId: contactId,
      phone: data.phone,
      type: 'MOBILE',
      isPrimary: true,
    })
  }

  if (data.linkedin) {
    await db.insert(contactSocialMedia).values({
      id: crypto.randomUUID(),
      contactId: contactId,
      socialMediaPlatform: 'LINKEDIN',
      url: data.linkedin,
      isPrimary: true,
    })
  }

  if (data.instagram) {
    await db.insert(contactSocialMedia).values({
      id: crypto.randomUUID(),
      contactId: contactId,
      socialMediaPlatform: 'INSTAGRAM',
      url: data.instagram,
      isPrimary: false,
    })
  }

  if (data.facebook) {
    await db.insert(contactSocialMedia).values({
      id: crypto.randomUUID(),
      contactId: contactId,
      socialMediaPlatform: 'FACEBOOK',
      url: data.facebook,
      isPrimary: false,
    })
  }

  return contactId
}
