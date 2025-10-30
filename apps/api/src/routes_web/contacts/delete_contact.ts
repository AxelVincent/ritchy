import { logger } from '@ritchy/logger'
import type {
  DeleteContactApiResponse,
  DeleteContactRequest,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { deleteContact } from '../../services/contact/queries/delete_contact'
import { verifyContactOwnership } from '../../services/contact/verify_contact_ownership'

export const deleteContactHandler = async (
  req: Request<
    { contactId: string },
    DeleteContactApiResponse,
    DeleteContactRequest
  >,
  res: Response<DeleteContactApiResponse>,
): Promise<void> => {
  try {
    const { contactId } = req.params
    const userId = req.auth?.userId

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      })
      return
    }

    logger.info({
      msg: '[DELETE /contacts/:contactId] Deleting contact',
      event: 'deleting_contact',
      metadata: { contactId, userId },
    })

    // Verify user owns this contact
    const isOwner = await verifyContactOwnership(contactId, userId)
    if (!isOwner) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this contact',
      })
      return
    }

    // Delete the contact
    const deletedContact = await deleteContact(contactId)

    logger.info({
      msg: '[DELETE /contacts/:contactId] Contact deleted successfully',
      event: 'contact_deleted',
      metadata: { contactId: deletedContact.id },
    })

    res.json({
      success: true,
      contactId: deletedContact.id,
    })
  } catch (error) {
    logger.error({
      msg: '[DELETE /contacts/:contactId] Failed to delete contact',
      event: 'failed_to_delete_contact',
      metadata: { error },
    })

    // Check if it's a known error
    if (error instanceof Error) {
      if (error.message.includes('primary contact')) {
        res.status(400).json({
          error: 'BadRequest',
          message: error.message,
        })
        return
      }
      if (error.message === 'Contact not found') {
        res.status(404).json({
          error: 'NotFound',
          message: error.message,
        })
        return
      }
    }

    res.status(500).json({
      error: 'InternalServerError',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
