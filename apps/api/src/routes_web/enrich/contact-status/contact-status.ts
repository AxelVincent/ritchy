import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import { getContactEnrichmentStatus } from '../../../services/enrichment/shared/status/status_manager'
import {
  ContactStatusParamsSchema,
  type ContactStatusResponse,
} from './contract'

export const getContactStatusHandler = async (
  req: Request<{ contactId: string }>,
  res: Response<ContactStatusResponse>,
): Promise<void> => {
  try {
    const { contactId } = ContactStatusParamsSchema.parse(req.params)
    const status = await getContactEnrichmentStatus(contactId)
    res.json(status)
  } catch (error) {
    logger.error({
      msg: 'Failed to get contact enrichment status',
      event: 'contact_status_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        contactId: req.params.contactId,
      },
    })
    res.status(500).json({
      status: 'idle',
      step: '',
      progress: 0,
      updatedAt: Date.now(),
      error: 'Failed to get contact enrichment status',
    })
  }
}
