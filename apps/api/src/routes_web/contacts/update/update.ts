import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../../../db/db'
import { contact } from '../../../db/schema'
import {
  setContactPrimary,
  unsetContactPrimary,
} from '../../../services/contact/queries/update_contact'
import { verifyContactOwnership } from '../../../services/contact/verify_contact_ownership'
import { updateLastInteraction } from '../../../services/places/utils/update_last_interaction'
import type { UpdateContactApiResponse, UpdateContactRequest } from './contract'

export const updateContactHandler = async (
  req: Request<
    { contactId: string },
    UpdateContactApiResponse,
    UpdateContactRequest
  >,
  res: Response<UpdateContactApiResponse>,
): Promise<void> => {
  try {
    const { contactId } = req.params
    const { isPrimary } = req.body
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
        message: 'You do not have permission to update this contact',
      })
      return
    }

    // Get the userPlaceId for this contact
    const [contactRecord] = await db
      .select({ userPlaceId: contact.userPlaceId })
      .from(contact)
      .where(eq(contact.id, contactId))
      .limit(1)

    if (!contactRecord) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Contact not found',
      })
      return
    }

    // Update primary status
    if (isPrimary !== undefined) {
      if (isPrimary === true) {
        await setContactPrimary(contactId, contactRecord.userPlaceId)
      } else {
        await unsetContactPrimary(contactId, contactRecord.userPlaceId)
      }
    }

    await updateLastInteraction(contactRecord.userPlaceId)

    res.json({ success: true })
  } catch (error) {
    logger.error({
      msg: 'Failed to update contact',
      event: 'failed_to_update_contact',
      metadata: { error },
    })
    res.status(500).json({
      error: 'InternalServerError',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
