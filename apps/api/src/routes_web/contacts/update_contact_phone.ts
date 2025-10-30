import { logger } from '@ritchy/logger'
import type {
  UpdateContactPhoneApiResponse,
  UpdateContactPhoneRequest,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import {
  setContactPhonePrimary,
  unsetContactPhonePrimary,
} from '../../services/contact/queries/update_contact_phone'
import { verifyContactOwnership } from '../../services/contact/verify_contact_ownership'

export const updateContactPhoneHandler = async (
  req: Request<
    { phoneId: string },
    UpdateContactPhoneApiResponse,
    UpdateContactPhoneRequest
  >,
  res: Response<UpdateContactPhoneApiResponse>,
): Promise<void> => {
  try {
    const { phoneId } = req.params
    const { contactId, isPrimary } = req.body
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
        message: 'You do not have permission to update this phone',
      })
      return
    }

    // Currently only supporting isPrimary updates
    if (isPrimary !== undefined) {
      if (isPrimary === true) {
        await setContactPhonePrimary(phoneId, contactId)
      } else {
        await unsetContactPhonePrimary(phoneId, contactId)
      }
    }

    res.json({ success: true })
  } catch (error) {
    logger.error({
      msg: 'Failed to update contact phone',
      event: 'failed_to_update_contact_phone',
      metadata: { error },
    })
    res.status(500).json({
      error: 'InternalServerError',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
