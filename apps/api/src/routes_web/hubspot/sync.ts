import { logger } from '@ritchy/logger'
import { syncPlaceApiResponseSchema, syncPlaceBodySchema } from '@ritchy/types'
import express, { type Router } from 'express'
import { z } from 'zod'
import { createOrUpdateCompaniesBatch } from '../../external/hubspot/sync/company'
import { createOrUpdateContactsBatch } from '../../external/hubspot/sync/contact'
import { withHubspotClient } from '../../external/hubspot/token_manager'
import type { HubspotBase } from '../../external/hubspot/types'
import { validateRequest } from '../../middleware/zodValidation'

const syncRouter: Router = express.Router()

syncRouter.post(
  '/places',
  validateRequest({
    bodySchema: syncPlaceBodySchema,
    responseSchema: syncPlaceApiResponseSchema,
  }),
  async (req, res) => {
    try {
      const placeIds = req.body.placeIds
      const userId = req.auth.userId
      const BATCH_SIZE = 30
      const allCompanies: HubspotBase[] = []
      const allContacts: HubspotBase[] = []

      const result = await withHubspotClient(userId, async (client) => {
        try {
          // Process in batches
          for (let i = 0; i < placeIds.length; i += BATCH_SIZE) {
            const batchPlaceIds = placeIds.slice(i, i + BATCH_SIZE)

            // 1. Process companies first (this creates the lead mappings)
            const companies = await createOrUpdateCompaniesBatch(
              batchPlaceIds,
              userId,
              client,
            )
            allCompanies.push(...companies)

            // 2. Process contacts (this only creates contacts for places that don't have them)
            const contacts = await createOrUpdateContactsBatch(
              batchPlaceIds,
              userId,
              client,
            )
            allContacts.push(...contacts)

            logger.info({
              msg: 'Completed batch sync to HubSpot',
              event: 'hubspot_sync_batch_complete',
              metadata: {
                batchIndex: i / BATCH_SIZE,
                batchSize: batchPlaceIds.length,
                companiesCreated: companies.length,
                contactsCreated: contacts.length,
                placeIds: batchPlaceIds,
              },
            })
          }

          return {
            success: true,
            companyIds: allCompanies.map((c) => c.id),
            contactIds: allContacts.map((c) => c.id),
          }
        } catch (error) {
          logger.error({
            msg: 'Failed to sync batch to HubSpot',
            event: 'hubspot_sync_batch_error',
            metadata: {
              error:
                error instanceof Error
                  ? {
                      message: error.message,
                      cause: (error as Error & { cause?: unknown }).cause,
                      stack: error.stack,
                    }
                  : error,
              userId,
            },
          })
          throw error
        }
      })

      res.json(result)
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
        })
        return
      }

      logger.error({
        msg: 'Failed to process sync request',
        event: 'hubspot_sync_request_error',
        metadata: { error, userId: req.auth.userId },
      })

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      })
    }
  },
)

export default syncRouter
