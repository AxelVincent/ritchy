import { logger } from '@ritchy/logger'
import { EnrichmentWebhookSchema } from '@ritchy/types'
import { eq } from 'drizzle-orm'
import type { Request, Response } from 'express'
import { db } from '../db/db'
import { webhookEvent } from '../db/schema'
import { saveEnrichmentData } from '../services/enrichment/saveEnrichmentData'
import { validateWebhookIdempotency } from '../utils/validate_webhook_idempotency'

type WebhookResponse = {
  received?: boolean
  error?: string
  message?: string
}

export const enrichmentWebhook = async (
  req: Request,
  res: Response<WebhookResponse>,
): Promise<void> => {
  logger.info({
    msg: 'Enrichment webhook received',
    event: 'enrichment_webhook_received',
    metadata: {
      body: req.body,
      eventType: req.body?.type,
      webhookKey: res.locals.webhookKey,
    },
  })

  // check if request is a duplicate
  const idempotencyResult = await validateWebhookIdempotency(
    req.headers,
    req.body,
    'enrichment',
  )

  if (idempotencyResult.isDuplicate) {
    res.json({ received: true, message: 'Enrichment data already processed' })
    return
  }

  try {
    // Validate request body
    const validatedData = EnrichmentWebhookSchema.parse(req.body)
    const { contactId, enrichmentData, source } = validatedData

    // Add id field to enrichmentData to match EnrichResponse type
    const enrichedDataWithId = {
      id: contactId, // Use contactId as the id
      emails: enrichmentData.emails,
      socialLinks: enrichmentData.socialLinks,
    }

    // Save enrichment data
    const result = await saveEnrichmentData({
      contactId,
      enrichmentData: enrichedDataWithId,
      source,
    })

    // Update webhook event status
    await db
      .update(webhookEvent)
      .set({ status: 'processed', processedAt: new Date() })
      .where(eq(webhookEvent.id, idempotencyResult.record.id))

    logger.info({
      msg: 'Enrichment webhook processed successfully',
      event: 'enrichment_webhook_success',
      metadata: {
        webhookId: idempotencyResult.record.id,
        contactId,
        source,
        stats: result,
      },
    })

    res.status(200).json({
      received: true,
      message: 'Enrichment data processed successfully',
    })
  } catch (error) {
    // Update webhook event status
    await db
      .update(webhookEvent)
      .set({
        status: 'failed',
        processedAt: new Date(),
        error: error instanceof Error ? error.message : String(error),
      })
      .where(eq(webhookEvent.id, idempotencyResult.record.id))

    logger.error({
      msg: 'Enrichment webhook processing failed',
      event: 'enrichment_webhook_error',
      metadata: {
        webhookId: idempotencyResult.record.id,
        error: error instanceof Error ? error.message : String(error),
        body: req.body,
      },
    })

    res.status(400).json({
      error: 'Failed to process enrichment data',
      message: error instanceof Error ? error.message : 'Validation error',
    })
  }
}
