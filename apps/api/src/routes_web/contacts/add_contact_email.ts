import { logger } from '@ritchy/logger'
import type {
  PostContactEmailApiResponse,
  PostContactEmailRequest,
  PostContactEmailResponse,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { db } from '../../db/db'
import { contact, contactEmail } from '../../db/schema'
import { getOrCreatePrimaryContact } from '../../services/contact/queries/insert_primary_contact'

export const postContactEmail = async (
  req: Request<
    Record<string, never>,
    PostContactEmailApiResponse,
    PostContactEmailRequest
  >,
  res: Response<PostContactEmailApiResponse>,
) => {
  try {
    const { email, userPlaceId } = req.body
    logger.info({
      msg: '[POST /contacts/email] Adding contact email',
      event: 'adding_contact_email',
      metadata: { email, userPlaceId },
    })

    const contactResult = await getOrCreatePrimaryContact(userPlaceId)

    const [contactEmailResult] = await db
      .insert(contactEmail)
      .values({
        email,
        contactId: contactResult.id,
        isPrimary: false,
      })
      .returning()

    res.json({
      id: contactEmailResult.id,
    })
  } catch (error) {
    logger.error({
      msg: '[POST /contacts/email] Failed to add contact email',
      event: 'failed_to_add_contact_email',
      metadata: { error },
    })
    res.status(500).json({
      error: 'Failed to add contact email',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
