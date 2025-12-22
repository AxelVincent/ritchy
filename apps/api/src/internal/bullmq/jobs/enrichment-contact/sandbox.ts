import 'dotenv/config'

import { logger } from '@ritchy/logger'
import type { SandboxedJob } from 'bullmq'
import { UnrecoverableError } from 'bullmq'
import { contactEnrichmentService } from '../../../../services/enrichment/contact_enrichment_service'
import { setContactEnrichmentStatus } from '../../../../services/enrichment/status_manager'
import { extractErrorMessage } from '../../utils/extract-error-message'
import type { ContactEnrichmentJobData } from './queue'

/**
 * Sandboxed processor for contact enrichment jobs.
 *
 * This file runs in a separate worker thread when useWorkerThreads is enabled.
 * It must be compiled to JS and referenced by path.
 *
 * IMPORTANT: This module is self-contained. All imports are initialized
 * fresh in each worker thread.
 */
export default async function (
  job: SandboxedJob<ContactEnrichmentJobData>,
): Promise<{ success: boolean; contactId: string }> {
  const { contactId, userPlaceId, userId, reservedCredits } = job.data

  try {
    await setContactEnrichmentStatus(
      contactId,
      'processing',
      'Starting contact enrichment',
      0,
    )

    await job.updateProgress({
      step: 'Starting contact enrichment',
      percent: 0,
    })

    await contactEnrichmentService({
      contactId,
      userPlaceId,
      userId,
      reservedCredits,
    })

    await job.updateProgress({
      step: 'Contact enrichment completed',
      percent: 100,
    })

    return { success: true, contactId }
  } catch (error) {
    const errorMessage = extractErrorMessage(error)

    await setContactEnrichmentStatus(
      contactId,
      'failed',
      errorMessage,
      100,
      errorMessage,
    )

    logger.error({
      msg: 'Contact enrichment job failed in sandbox',
      event: 'contact_enrichment_sandbox_error',
      metadata: {
        jobId: job.id,
        contactId,
        error: errorMessage,
      },
    })

    throw new UnrecoverableError(errorMessage)
  }
}
