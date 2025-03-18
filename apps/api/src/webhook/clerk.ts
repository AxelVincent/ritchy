import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import { Webhook } from 'svix'
import { CLERK_CONFIG } from '../config/clerk'

import { eq } from 'drizzle-orm'
import { db } from '../db/db'
import { user, webhookEvent } from '../db/schema'
import { deleteUser } from '../services/user/deleteUser'

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

export type ClerkUserData = {
  clerkId: string
  email: string
  firstName: string
  lastName: string
}

export const clerkWebhook = async (
  req: Request,
  res: Response<WebhookResponse>,
): Promise<void> => {
  logger.info({
    msg: 'Clerk webhook received',
    event: 'webhook_received',
    metadata: {
      eventType: req.body?.type,
      webhookKey: res.locals.webhookKey,
    },
  })

  const payload = JSON.stringify(req.body)
  const headers = {
    'svix-id': req.headers['svix-id'] as string,
    'svix-signature': req.headers['svix-signature'] as string,
    'svix-timestamp': req.headers['svix-timestamp'] as string,
  }

  const wh = new Webhook(CLERK_CONFIG.API_KEYS.WEBHOOK_SECRET)

  try {
    const msg = wh.verify(payload, headers) as ClerkWebhookEvent

    logger.info({
      msg: 'Webhook signature verified successfully',
      event: 'webhook_signature_verified',
      metadata: {
        eventType: msg.type,
        webhookKey: res.locals.webhookKey,
      },
    })

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

    logger.info({
      msg: 'Webhook record created',
      event: 'webhook_record_created',
      metadata: {
        webhookId: webhookRecord.id,
        eventType: msg.type,
        webhookKey: res.locals.webhookKey,
      },
    })

    try {
      const userData: ClerkUserData = {
        clerkId: msg.data.id,
        email: msg.data.email_addresses[0]?.email_address,
        firstName: msg.data.first_name,
        lastName: msg.data.last_name,
      }

      await logger.runWithContext(
        {
          user: {
            id: '',
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
          },
        },
        async () => {
          switch (msg.type) {
            case 'user.created': {
              logger.info({
                msg: 'Processing user creation',
                event: 'user_creation_started',
                metadata: {
                  clerkId: userData.clerkId,
                  email: userData.email,
                  name: `${userData.firstName} ${userData.lastName}`.trim(),
                },
              })

              await db.insert(user).values(userData)

              logger.info({
                msg: 'User created successfully',
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
              logger.info({
                msg: 'Processing user update',
                event: 'user_update_started',
                metadata: {
                  clerkId: userData.clerkId,
                  email: userData.email,
                  name: `${userData.firstName} ${userData.lastName}`.trim(),
                },
              })

              await db
                .update(user)
                .set(userData)
                .where(eq(user.clerkId, msg.data.id))

              logger.info({
                msg: 'User updated successfully',
                event: 'user_updated',
                metadata: {
                  clerkId: userData.clerkId,
                  email: userData.email,
                  name: `${userData.firstName} ${userData.lastName}`.trim(),
                },
              })
              res.json({ received: true, message: 'User updated successfully' })
              break
            }
            case 'user.deleted': {
              const result = await deleteUser(userData)
              res.json(result)
              break
            }
            default:
              logger.info({
                msg: 'Unhandled webhook event received',
                event: 'unhandled_webhook_event',
                metadata: {
                  clerkId: userData.clerkId,
                  eventType: msg.type,
                },
              })
              res.json({ received: true, message: 'Unhandled webhook event' })
          }

          logger.info({
            msg: 'Webhook processed successfully',
            event: 'webhook_processed',
            metadata: {
              eventType: msg.type,
              webhookKey: res.locals.webhookKey,
            },
          })
        },
      )
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
