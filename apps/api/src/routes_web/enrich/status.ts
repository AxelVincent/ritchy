import { logger } from '@ritchy/logger'
import type {
  BatchEnrichmentStatusResponse,
  EnrichmentStatusResponse,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { z } from 'zod'
import {
  getBatchContactEnrichmentStatus,
  getBatchEnrichmentStatus,
  getCompanyEnrichmentStatus,
  getContactEnrichmentStatus,
  getEnrichmentStatus,
} from '../../services/enrichment/shared/status/status_manager'

const StatusParamsSchema = z.object({
  userPlaceId: z.string().uuid(),
})

const BatchStatusQuerySchema = z.object({
  userPlaceIds: z
    .union([z.string().uuid(), z.array(z.string().uuid())])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .pipe(z.array(z.string().uuid()).min(1).max(500)), // Increased to 500 to support larger tables
})

export const getEnrichmentStatusHandler = async (
  req: Request<{ userPlaceId: string }>,
  res: Response<EnrichmentStatusResponse>,
): Promise<void> => {
  try {
    const { userPlaceId } = StatusParamsSchema.parse(req.params)
    const status = await getEnrichmentStatus(userPlaceId)
    res.json(status)
  } catch (error) {
    logger.error({
      msg: 'Failed to get enrichment status',
      event: 'enrichment_status_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        userPlaceId: req.params.userPlaceId,
      },
    })
    res.status(500).json({
      status: 'idle',
      step: '',
      progress: 0,
      updatedAt: Date.now(),
      error: 'Failed to get enrichment status',
    })
  }
}

export const getBatchEnrichmentStatusHandler = async (
  req: Request<
    Record<string, never>,
    BatchEnrichmentStatusResponse,
    unknown,
    { userPlaceIds: string }
  >,
  res: Response<BatchEnrichmentStatusResponse>,
): Promise<void> => {
  try {
    const { userPlaceIds } = BatchStatusQuerySchema.parse(req.query)
    const statusMap = await getBatchEnrichmentStatus(userPlaceIds)
    res.json(statusMap)
  } catch (error) {
    logger.error({
      msg: 'Failed to get batch enrichment status',
      event: 'batch_enrichment_status_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })
    res.status(500).json({})
  }
}

// Company status schemas
const CompanyStatusParamsSchema = z.object({
  userPlaceId: z.string().uuid(),
})

// Contact status schemas
const ContactStatusParamsSchema = z.object({
  contactId: z.string().uuid(),
})

const BatchContactStatusQuerySchema = z.object({
  contactIds: z
    .union([z.string().uuid(), z.array(z.string().uuid())])
    .transform((val) => (Array.isArray(val) ? val : [val]))
    .pipe(z.array(z.string().uuid()).min(1).max(100)),
})

/**
 * Get company enrichment status
 * GET /enrich/company/status/:userPlaceId
 */
export const getCompanyStatusHandler = async (
  req: Request<{ userPlaceId: string }>,
  res: Response<EnrichmentStatusResponse>,
): Promise<void> => {
  try {
    const { userPlaceId } = CompanyStatusParamsSchema.parse(req.params)
    const status = await getCompanyEnrichmentStatus(userPlaceId)
    res.json(status)
  } catch (error) {
    logger.error({
      msg: 'Failed to get company enrichment status',
      event: 'company_status_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        userPlaceId: req.params.userPlaceId,
      },
    })
    res.status(500).json({
      status: 'idle',
      step: '',
      progress: 0,
      updatedAt: Date.now(),
      error: 'Failed to get company enrichment status',
    })
  }
}

/**
 * Get contact enrichment status
 * GET /enrich/contact/status/:contactId
 */
export const getContactStatusHandler = async (
  req: Request<{ contactId: string }>,
  res: Response<EnrichmentStatusResponse>,
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

/**
 * Get batch contact enrichment status
 * GET /enrich/contact/status?contactIds=...
 */
export const getBatchContactStatusHandler = async (
  req: Request<
    Record<string, never>,
    Record<string, EnrichmentStatusResponse>,
    unknown,
    { contactIds: string }
  >,
  res: Response<Record<string, EnrichmentStatusResponse>>,
): Promise<void> => {
  try {
    const { contactIds } = BatchContactStatusQuerySchema.parse(req.query)
    const statusMap = await getBatchContactEnrichmentStatus(contactIds)
    res.json(statusMap)
  } catch (error) {
    logger.error({
      msg: 'Failed to get batch contact enrichment status',
      event: 'batch_contact_status_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })
    res.status(500).json({})
  }
}
