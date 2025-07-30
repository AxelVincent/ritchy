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

import { enrichmentQueue } from '../../internal/bullmq/jobs/enrichment/queue'

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

    // Create a single job for the entire batch
    const job = await enrichmentQueue.add('enrichment', {
      enrichments,
      totalCount: enrichments.length,
      processedCount: 0,
      errors: [],
    })

    res.json({
      jobId: job.id ?? '',
      message: `Enrichment job started. Processing ${enrichments.length} websites.`,
      enrichmentCount: enrichments.length,
    })
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

// Update the job status endpoint
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

    if (!jobId) {
      res.status(400).json({
        error: 'Job ID is required',
      })
      return
    }

    const job = await enrichmentQueue.getJob(jobId)

    // If job is not found, check if it was completed and removed
    if (!job) {
      logger.info({
        msg: 'Enrichment job not found',
        event: 'enrichment_job_not_found',
        metadata: { jobId },
      })
      res.status(404).json({
        error: 'Job not found',
      })
      return
    }

    const state = await job.getState()
    const progress = (await job.progress) || 0
    const data = await job.data

    logger.info({
      msg: 'Enrichment job status',
      event: 'enrichment_job_status',
      metadata: { jobId, state, progress, data },
    })

    res.json({
      status: state,
      progress: progress as number,
      data: {
        jobId: job.id ?? '',
        totalMessages: data.totalCount,
        processedMessages: data.processedCount,
        remainingMessages: data.totalCount - data.processedCount,
        startedAt: job.timestamp.toString(),
        completedAt: job.finishedOn
          ? new Date(job.finishedOn).toISOString()
          : undefined,
        errors: data.errors.map((error) => error.error),
      },
    })
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
