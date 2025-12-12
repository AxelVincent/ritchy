import { logger } from '@ritchy/logger'
import type {
  PostContactPhoneApiResponse,
  PostContactPhoneRequest,
} from '@ritchy/types'
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../db/db'
import { contact } from '../../db/schema'
import { insertContactPhone } from '../../services/contact/queries/insert_contact_phone'
import { verifyContactOwnership } from '../../services/contact/verify_contact_ownership'
import { updateLastInteraction } from '../../services/places/utils/update_last_interaction'

export const postContactPhone = async (
  req: Request<
    Record<string, never>,
    PostContactPhoneApiResponse,
    PostContactPhoneRequest
  >,
  res: Response<PostContactPhoneApiResponse>,
): Promise<void> => {
  try {
    const { phone, type, contactId } = req.body
    const userId = req.auth?.userId

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      })
      return
    }

    // Verify user owns this contact
    const isOwner = await verifyContactOwnership(contactId, userId)
    if (!isOwner) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to add phones to this contact',
      })
      return
    }

    logger.info({
      msg: '[POST /contacts/phone] Adding contact phone',
      event: 'adding_contact_phone',
      metadata: { phone, type, contactId },
    })

    const contactPhoneResult = await insertContactPhone(
      contactId,
      phone,
      type,
      false,
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
      id: contactPhoneResult?.id ?? '',
    })
  } catch (error) {
    logger.error({
      msg: '[POST /contacts/phone] Failed to add contact phone',
      event: 'failed_to_add_contact_phone',
      metadata: { error },
    })
    res.status(500).json({
      error: 'Failed to add contact phone',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
