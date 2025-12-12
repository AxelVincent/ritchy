import { logger } from '@ritchy/logger'
import type {
  PostContactEmailApiResponse,
  PostContactEmailRequest,
  PostContactEmailResponse,
} from '@ritchy/types'
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../db/db'
import { contact, contactEmail } from '../../db/schema'
import { getOrCreatePrimaryContact } from '../../services/contact/queries/insert_primary_contact'
import { verifyAndInsertContactEmail } from '../../services/contact/verify_and_insert_contact_email'
import { updateLastInteraction } from '../../services/places/utils/update_last_interaction'

export const postContactEmail = async (
  req: Request<
    Record<string, never>,
    PostContactEmailApiResponse,
    PostContactEmailRequest
  >,
  res: Response<PostContactEmailApiResponse>,
) => {
  try {
    const { email, contactId } = req.body
    logger.info({
      msg: '[POST /contacts/email] Adding contact email',
      event: 'adding_contact_email',
      metadata: { email, contactId },
    })

    const contactEmailResult = await verifyAndInsertContactEmail(
      contactId,
      '',
      email,
    )

    // Get userPlaceId from contact and update last interaction
    const [contactRecord] = await db
      .select({ userPlaceId: contact.userPlaceId })
      .from(contact)
      .where(eq(contact.id, contactId))
      .limit(1)

    if (contactRecord) {
      await updateLastInteraction(contactRecord.userPlaceId)
    }

    res.json({
      id: contactEmailResult?.id ?? '',
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
