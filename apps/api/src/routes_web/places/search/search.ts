import { logger } from '@ritchy/logger'
import {
  type PlacesSearchApiResponse,
  type PlacesSearchRequestBody,
  PlacesSearchRequestBodySchema,
  PlacesSearchResponseSchema,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { postTextSearchV1 } from '../../../external/google_maps/text_search_V1'

import { getListAssociationsByPlaceIds } from '../../../services/lists/getListAssociationsByPlaceIds'
import { getNotesByPlaceIds } from '../../../services/notes/getNotesByPlaceIds'

/**
 * Searches for places based on text query and location bias
 * @param req Express request
 * @param res Express response
 * @returns Promise<ApiResponse<TextSearchResponse>>
 */
export const searchPlaces = async (
  req: Request<
    Record<string, never>,
    PlacesSearchApiResponse,
    PlacesSearchRequestBody
  >,
  res: Response<PlacesSearchApiResponse>,
): Promise<void> => {
  try {
    // Add request validation
    if (!req.body) {
      res.status(400).json({
        error: 'Request body is required',
        message: 'Please provide search parameters',
      })
    }

    const userId = req.auth.userId

    const model = req.body.model
    if (model === 'PRO' || model === 'EXPLORER') {
      if (
        ![
          // Ryan Staging / Prod
          'user_2pLKf5Yr8yJfZQbultG2uJ8pgFm',
          'user_2pLdQum1fXENokXcvNTsOdRWyts',
          // Axel Staging / Prod
          'user_2p7ZA02lG6WufI5SV3l6zyAoAIo',
          'user_2pLd3diNenMMUy61qNECHbSlnHK',
        ].includes(userId)
      ) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'This feature is only available for EXPLORER/PRO users',
        })
      }
    }

    // Validate request body
    const validatedRequest = PlacesSearchRequestBodySchema.parse(req.body)

    const results = await postTextSearchV1(validatedRequest)

    // Get associations and notes for each place
    const placeIds = results.map((result) => result.id)
    const associations = await getListAssociationsByPlaceIds(placeIds, userId)
    const notes = await getNotesByPlaceIds(placeIds, userId)

    // Map results with associations and notes
    const mappedResults = results.map((result) => ({
      ...result,
      associatedLists: associations.get(result.id),
      notes: notes.get(result.id),
    }))

    // Validate response
    const validatedResults = PlacesSearchResponseSchema.parse(mappedResults)

    logger.info({
      msg: 'Search places',
      event: 'search_places',
      metadata: {
        results: validatedResults.length,
      },
    })
    res.json(validatedResults)
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info({
        msg: 'Validation error',
        event: 'validation_error',
        metadata: { error },
      })
      res.status(400).json({
        error: 'Invalid request data',
        details: error.errors,
      })
    }

    logger.error({
      msg: 'Search places error',
      event: 'search_places_error',
      metadata: { error },
    })
    res.status(500).json({ error: 'Failed to search places' })
  }
}
