import { logger } from '@ritchy/logger'
import {
  type BatchEnrichmentRequestBody,
  BatchEnrichmentRequestBodySchema,
  type BatchEnrichmentResponse,
  BatchEnrichmentResponseSchema,
  type EnrichmentJobStatusApiResponse,
  type EnrichmentJobStatusParams,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { z } from 'zod'

import {
  add_enrichment_batch,
  get_job_status,
} from '../../services/enrichment/queue/batch_enrichment_queue'

/**
 * Batch enrichment endpoint for processing multiple enrichments
 * @param req Express request with batch enrichment data
 * @param res Express response
 */
export const batchEnrichWebsites = async (
  req: Request<
    Record<string, never>,
    BatchEnrichmentResponse,
    BatchEnrichmentRequestBody
  >,
  res: Response<BatchEnrichmentResponse>,
): Promise<void> => {
  try {
    // Validate request body
    const { enrichments } = BatchEnrichmentRequestBodySchema.parse(req.body)
    const userId = req.auth.userId

    if (enrichments.length === 0) {
      res.status(400).json({
        jobId: '',
        message: 'No enrichments provided',
        enrichmentCount: 0,
      })
      return
    }

    if (enrichments.length > 500) {
      res.status(400).json({
        jobId: '',
        message: 'Too many enrichments requested. Maximum 500 per batch.',
        enrichmentCount: 0,
      })
      return
    }

    logger.info({
      msg: 'Processing batch enrichment request',
      event: 'batch_enrichment_request',
      metadata: { userId, enrichmentCount: enrichments.length },
    })

    // Add enrichments to the job queue
    const jobId = await add_enrichment_batch(userId, enrichments)

    logger.info({
      msg: 'Batch enrichment job queued successfully',
      event: 'batch_enrichment_queued',
      metadata: { userId, jobId, enrichmentCount: enrichments.length },
    })

    const response: BatchEnrichmentResponse = {
      jobId,
      message: `Enrichment job started. Processing ${enrichments.length} websites.`,
      enrichmentCount: enrichments.length,
    }

    // Validate response
    const validatedResponse = BatchEnrichmentResponseSchema.parse(response)

    res.json(validatedResponse)
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info({
        msg: 'Validation error in batch enrichment request',
        event: 'batch_enrichment_validation_error',
        metadata: {
          error: error.errors,
          body: req.body,
        },
      })
      res.status(400).json({
        jobId: '',
        message: 'Invalid request parameters',
        enrichmentCount: 0,
      })
      return
    }

    logger.error({
      msg: 'Batch enrichment request failed',
      event: 'batch_enrichment_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        userId: req.auth.userId,
      },
    })
    res.status(500).json({
      jobId: '',
      message: 'Failed to start batch enrichment',
      enrichmentCount: 0,
    })
  }
}

// Add this new endpoint
export const getEnrichmentJobStatus = async (
  req: Request<
    Record<string, never>,
    EnrichmentJobStatusApiResponse,
    unknown,
    EnrichmentJobStatusParams
  >,
  res: Response<EnrichmentJobStatusApiResponse>,
): Promise<void> => {
  try {
    const { jobId } = req.params
    const userId = req.auth.userId

    if (!jobId) {
      res.status(400).json({
        error: 'Job ID is required',
      })
      return
    }

    logger.info({
      msg: 'Getting enrichment job status',
      event: 'enrichment_job_status_request',
      metadata: { userId, jobId },
    })

    const status = await get_job_status(jobId)

    res.json(status)
  } catch (error) {
    logger.error({
      msg: 'Failed to get enrichment job status',
      event: 'enrichment_job_status_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        jobId: req.params.jobId,
      },
    })
    res.status(500).json({ error: 'Failed to get job status' })
  }
}
