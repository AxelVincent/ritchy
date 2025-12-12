import { logger } from '@ritchy/logger'
import type {
  DeleteContactPhoneApiResponse,
  DeleteContactPhoneRequest,
} from '@ritchy/types'
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../db/db'
import { contact } from '../../db/schema'
import { deleteContactPhone } from '../../services/contact/queries/delete_contact_phone'
import { verifyContactOwnership } from '../../services/contact/verify_contact_ownership'
import { updateLastInteraction } from '../../services/places/utils/update_last_interaction'

export const deleteContactPhoneHandler = async (
  req: Request<
    { phoneId: string },
    DeleteContactPhoneApiResponse,
    DeleteContactPhoneRequest
  >,
  res: Response<DeleteContactPhoneApiResponse>,
): Promise<void> => {
  try {
    const { phoneId } = req.params
    const { contactId } = req.body
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
        message: 'You do not have permission to delete this phone',
      })
      return
    }

    const success = await deleteContactPhone(phoneId, contactId)

    if (!success) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Phone not found',
      })
      return
    }

    // Get userPlaceId from contact and update last interaction
    const [contactRecord] = await db
      .select({ userPlaceId: contact.userPlaceId })
      .from(contact)
      .where(eq(contact.id, contactId))
      .limit(1)

    if (contactRecord) {
      await updateLastInteraction(contactRecord.userPlaceId)
    }

    res.json({ success: true })
  } catch (error) {
    logger.error({
      msg: 'Failed to delete contact phone',
      event: 'failed_to_delete_contact_phone',
      metadata: { error },
    })
    res.status(500).json({
      error: 'InternalServerError',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
