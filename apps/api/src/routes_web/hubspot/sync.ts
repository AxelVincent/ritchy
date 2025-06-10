import { logger } from '@ritchy/logger'
import { syncPlaceApiResponseSchema, syncPlaceBodySchema } from '@ritchy/types'
import express, { type Router } from 'express'
import { z } from 'zod'
import { createOrUpdateCompanies } from '../../external/hubspot/company'
import { createOrUpdateContacts } from '../../external/hubspot/contact'
import { createPlaceCompanyMapping } from '../../external/hubspot/helpers/create_place_company_mapping'
import { withHubspotClient } from '../../external/hubspot/token_manager'
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

      const result = await withHubspotClient(userId, async (client) => {
        try {
          // First create/update companies
          const companies = await createOrUpdateCompanies(
            placeIds,
            userId,
            client,
          )

          // Create a map of placeId to companyId for contact association
          const placeCompanyMappings = createPlaceCompanyMapping(
            placeIds,
            companies,
          )

          // Then create/update contacts
          const contacts = await createOrUpdateContacts(
            placeIds,
            userId,
            client,
            placeCompanyMappings,
          )

          return {
            success: true,
            companyIds: companies.map((c) => c.id),
            contactIds: contacts.map((c) => c.id),
          }
        } catch (error) {
          logger.error({
            msg: 'Failed to sync to HubSpot',
            event: 'hubspot_sync_error',
            metadata: { error, placeIds, userId },
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
