import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import { Webhook } from 'svix'
import { CLERK_CONFIG } from '../config/clerk'

import { eq } from 'drizzle-orm'
import { db } from '../db/db'
import { user, webhookEvent } from '../db/schema'
import { credits as creditsTable } from '../db/schema/credits'
import { sendSlackNotification } from '../external/slack/slack'
import { CREDIT_CONFIG } from '../services/payment/config'
import { deleteUser } from '../services/user/deleteUser'
import { validateWebhookIdempotency } from '../utils/validate_webhook_idempotency'

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
    phone_numbers: Array<{
      id: string
      phone_number: string
      object: string
      created_at: number
      updated_at: number
      default_second_factor: boolean
      reserved: boolean
      reserved_for_second_factor: boolean
      backup_codes: null
      verification: null
      linked_to: unknown[]
    }>
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
  phoneNumber: string
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

    const { record, isDuplicate } = await validateWebhookIdempotency(
      req.headers,
      msg.data,
      msg.type,
    )

    if (isDuplicate) {
      res.status(200).json({ received: true, message: 'Already processed' })
      return
    }

    try {
      if (!msg.data) {
        throw new Error('Webhook data is missing')
      }

      const userData: ClerkUserData = {
        clerkId: msg.data.id,
        email: msg.data.email_addresses?.[0]?.email_address || '',
        firstName: msg.data.first_name || '',
        lastName: msg.data.last_name || '',
        phoneNumber: msg.data.phone_numbers?.[0]?.phone_number || '',
      }

      logger.info({
        msg: 'Processing webhook data',
        event: 'webhook_data_received',
        metadata: {
          dataReceived: JSON.stringify(msg.data),
          eventType: msg.type,
        },
      })

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

              const [createdUser] = await db
                .insert(user)
                .values(userData)
                .returning()

              if (createdUser) {
                const creditConfig = CREDIT_CONFIG.find(
                  (config) => config.plan === 'FREE',
                )
                const credits = creditConfig?.credits ?? 0
                await db.insert(creditsTable).values({
                  userId: createdUser.id,
                  credits,
                })
                logger.info({
                  msg: 'Credits generated for new user',
                  event: 'credits_generated',
                  metadata: {
                    userId: createdUser.id,
                    credits,
                  },
                })
              } else {
                logger.error({
                  msg: 'Failed to retrieve created user ID',
                  event: 'user_creation_no_id',
                  metadata: { clerkId: userData.clerkId },
                })
              }

              sendSlackNotification({
                text: `🎉 New user registered!\nName: ${userData.firstName} ${userData.lastName}\nEmail: ${userData.email}\nPhone: ${userData.phoneNumber}`,
                channel: 'users',
              })

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
        .where(eq(webhookEvent.id, record.id))

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
