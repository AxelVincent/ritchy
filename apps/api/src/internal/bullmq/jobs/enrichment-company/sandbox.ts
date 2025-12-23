import 'dotenv/config'

import { logger } from '@ritchy/logger'
import type { SandboxedJob } from 'bullmq'
import { UnrecoverableError } from 'bullmq'
import { companyEnrichmentService } from '../../../../services/enrichment/company_enrichment_service'
import { setCompanyEnrichmentStatus } from '../../../../services/enrichment/status_manager'
import { extractErrorMessage } from '../../utils/extract-error-message'
import type { CompanyEnrichmentJobData } from './queue'

/**
 * Sandboxed processor for company enrichment jobs.
 *
 * This file runs in a separate worker thread when useWorkerThreads is enabled.
 * It must be compiled to JS and referenced by path.
 *
 * IMPORTANT: This module is self-contained. All imports are initialized
 * fresh in each worker thread.
 */
export default async function (
  job: SandboxedJob<CompanyEnrichmentJobData>,
): Promise<{ success: boolean; enrichmentId: string }> {
  console.log('[SANDBOX] Function called with job:', job.id)

  const { userPlaceId, enrichmentId, placeId, userId } = job.data

  console.log('[SANDBOX] Extracted data:', {
    userPlaceId,
    enrichmentId,
    placeId,
    userId,
  })

  logger.info({
    msg: 'Sandbox processor started',
    event: 'company_enrichment_sandbox_start',
    metadata: { jobId: job.id, userPlaceId, enrichmentId },
  })

  try {
    logger.debug({
      msg: 'Setting initial status',
      event: 'company_enrichment_sandbox_status',
      metadata: { jobId: job.id },
    })

    await setCompanyEnrichmentStatus(
      userPlaceId,
      'processing',
      'Starting company enrichment',
      0,
    )

    logger.debug({
      msg: 'Calling companyEnrichmentService',
      event: 'company_enrichment_sandbox_service_call',
      metadata: { jobId: job.id },
    })

    await companyEnrichmentService({
      userPlaceId,
      enrichmentId,
      placeId,
      userId,
    })

    logger.info({
      msg: 'Sandbox processor completed',
      event: 'company_enrichment_sandbox_complete',
      metadata: { jobId: job.id, userPlaceId, enrichmentId },
    })

    return { success: true, enrichmentId }
  } catch (error) {
    const errorMessage = extractErrorMessage(error)

    await setCompanyEnrichmentStatus(
      userPlaceId,
      'failed',
      errorMessage,
      100,
      errorMessage,
    )

    logger.error({
      msg: 'Company enrichment job failed in sandbox',
      event: 'company_enrichment_sandbox_error',
      metadata: {
        jobId: job.id,
        userPlaceId,
        error: errorMessage,
      },
    })

    throw new UnrecoverableError(errorMessage)
  }
}
