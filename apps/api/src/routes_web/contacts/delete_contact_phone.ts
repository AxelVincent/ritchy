import { logger } from '@ritchy/logger'
import type {
  DeleteContactPhoneApiResponse,
  DeleteContactPhoneRequest,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { deleteContactPhone } from '../../services/contact/queries/delete_contact_phone'
import { verifyContactOwnership } from '../../services/contact/verify_contact_ownership'

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
