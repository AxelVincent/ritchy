import { logger } from '@ritchy/logger'
import {
  type PlacesSearchApiResponse,
  type PlacesSearchRequestBody,
  PlacesSearchRequestBodySchema,
  PlacesSearchResponseSchema,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { postTextSearchV1 } from '../../external/google_maps/text_search_V1'
import { findListAssociationsForPlaces } from '../../services/lists/findListAssociationsForPlaces'
import { getLargestSquareFromCoordinates } from '../../utils/geo_utils'

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
      res.status(400).json({ error: 'Request body is required' })
    }

    const userId = req.auth.userId

    // Validate request body
    const parsedBody = PlacesSearchRequestBodySchema.parse(req.body)

    const largestSquare = getLargestSquareFromCoordinates(
      parsedBody.locationBias.circle.center,
      parsedBody.locationBias.circle.radiusInMeters,
    )
    const requestBody = {
      textQuery: parsedBody.textQuery,
      locationRestriction: {
        rectangle: {
          low: largestSquare.southWest,
          high: largestSquare.northEast,
        },
      },
      resultsQuantity: parsedBody.resultsQuantity,
    }
    const results = await postTextSearchV1(requestBody)

    const associations = await findListAssociationsForPlaces(
      results.map((result) => result.id),
      userId,
    )
    logger.info({
      msg: 'Associations',
      event: 'associations',
      metadata: { associations },
    })

    const mappedResults = results.map((result) => ({
      ...result,
      associatedLists: associations.get(result.id),
    }))
    // Validate response
    const validatedResults = PlacesSearchResponseSchema.parse(mappedResults)
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
