import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import { Webhook } from 'svix'
import { CLERK_CONFIG } from '../config/clerk'

import { eq } from 'drizzle-orm'
import { db } from '../db/db'
import { user, webhookEvent } from '../db/schema'

type WebhookResponse = {
  received?: boolean
  error?: string
  message?: string
}

type ClerkWebhookEvent = {
  data: {
    id: string
    email_addresses: Array<{ email_address: string }>
    first_name: string
    last_name: string
  }
  type: string
  object: 'event'
  timestamp: number
}

export const clerkWebhook = async (
  req: Request,
  res: Response<WebhookResponse>,
): Promise<void> => {
  const payload = JSON.stringify(req.body)
  const headers = {
    'svix-id': req.headers['svix-id'] as string,
    'svix-signature': req.headers['svix-signature'] as string,
    'svix-timestamp': req.headers['svix-timestamp'] as string,
  }

  const wh = new Webhook(CLERK_CONFIG.API_KEYS.WEBHOOK_SECRET)

  try {
    const msg = wh.verify(payload, headers) as ClerkWebhookEvent

    const [webhookRecord] = await db
      .insert(webhookEvent)
      .values({
        type: msg.type,
        service: 'clerk',
        payload: msg.data,
        idempotencyKey: res.locals.webhookKey,
        status: 'processed',
      })
      .returning()

    try {
      const userData = {
        clerkId: msg.data.id,
        email: msg.data.email_addresses[0]?.email_address,
        firstName: msg.data.first_name,
        lastName: msg.data.last_name,
      }

      switch (msg.type) {
        case 'user.created': {
          await db.insert(user).values(userData)

          logger.info({
            msg: 'User created',
            event: 'user_created',
            metadata: {
              clerkId: userData.clerkId,
              email: userData.email,
              name: `${userData.firstName} ${userData.lastName}`.trim(),
            },
          })
          res.json({ received: true, message: 'User created successfully' })
          break
        }
        case 'user.updated': {
          await db
            .update(user)
            .set(userData)
            .where(eq(user.clerkId, msg.data.id))

          logger.info({
            msg: 'User updated',
            event: 'user_updated',
            metadata: { clerkId: userData.clerkId },
          })
          res.json({ received: true, message: 'User updated successfully' })
          break
        }
        case 'user.deleted': {
          logger.warn({
            msg: '[TO HANDLE] User deleted',
            event: 'user_deleted',
            metadata: { clerkId: userData.clerkId },
          })
          res.json({ received: true, message: 'User deleted successfully' })
          break
        }
        default:
          logger.info({
            msg: 'Unhandled webhook event',
            event: msg.type,
            metadata: { clerkId: userData.clerkId },
          })
          res.json({ received: true, message: 'Unhandled webhook event' })
      }
    } catch (processingError) {
      await db
        .update(webhookEvent)
        .set({
          status: 'failed',
          error:
            processingError instanceof Error
              ? processingError.message
              : String(processingError),
        })
        .where(eq(webhookEvent.id, webhookRecord.id))

      throw processingError
    }
  } catch (err) {
    logger.error({
      msg: 'Failed to verify webhook',
      event: 'webhook_verification_failed',
      metadata: {
        error:
          err instanceof Error
            ? {
                message: err.message,
                name: err.name,
                stack: err.stack,
              }
            : err,
      },
    })
    res.status(400).json({ error: 'Invalid webhook signature' })
  }
}
