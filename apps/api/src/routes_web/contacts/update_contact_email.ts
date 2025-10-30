import { logger } from '@ritchy/logger'
import type {
  UpdateContactEmailApiResponse,
  UpdateContactEmailRequest,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import {
  setContactEmailPrimary,
  unsetContactEmailPrimary,
} from '../../services/contact/queries/update_contact_email'
import { verifyContactOwnership } from '../../services/contact/verify_contact_ownership'

export const updateContactEmailHandler = async (
  req: Request<
    { emailId: string },
    UpdateContactEmailApiResponse,
    UpdateContactEmailRequest
  >,
  res: Response<UpdateContactEmailApiResponse>,
): Promise<void> => {
  try {
    const { emailId } = req.params
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
        message: 'You do not have permission to update this email',
      })
      return
    }

    // Currently only supporting isPrimary updates
    if (isPrimary !== undefined) {
      if (isPrimary === true) {
        await setContactEmailPrimary(emailId, contactId)
      } else {
        await unsetContactEmailPrimary(emailId, contactId)
      }
    }

    res.json({ success: true })
  } catch (error) {
    logger.error({
      msg: 'Failed to update contact email',
      event: 'failed_to_update_contact_email',
      metadata: { error },
    })
    res.status(500).json({
      error: 'InternalServerError',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
