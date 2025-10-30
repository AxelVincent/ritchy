import { logger } from '@ritchy/logger'
import type {
  DeleteContactEmailApiResponse,
  DeleteContactEmailRequest,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { deleteContactEmail } from '../../services/contact/queries/delete_contact_email'
import { verifyContactOwnership } from '../../services/contact/verify_contact_ownership'

export const deleteContactEmailHandler = async (
  req: Request<
    { emailId: string },
    DeleteContactEmailApiResponse,
    DeleteContactEmailRequest
  >,
  res: Response<DeleteContactEmailApiResponse>,
): Promise<void> => {
  try {
    const { emailId } = req.params
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
        message: 'You do not have permission to delete this email',
      })
      return
    }

    const success = await deleteContactEmail(emailId, contactId)

    if (!success) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Email not found',
      })
      return
    }

    res.json({ success: true })
  } catch (error) {
    logger.error({
      msg: 'Failed to delete contact email',
      event: 'failed_to_delete_contact_email',
      metadata: { error },
    })
    res.status(500).json({
      error: 'InternalServerError',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
