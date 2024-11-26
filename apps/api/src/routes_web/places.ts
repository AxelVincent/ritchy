import {
  type PlacesSearchApiResponse,
  type PlacesSearchRequestBody,
  PlacesSearchRequestBodySchema,
  PlacesSearchResponseSchema
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { postTextSearchV1 } from '../external/google_maps/text_search_V1'

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
  res: Response<PlacesSearchApiResponse>
): Promise<void> => {
  try {
    console.log('Processing place search request', {
      body: req.body,
      auth: req.auth
    })

    // Add request validation
    if (!req.body) {
      res.status(400).json({ error: 'Request body is required' })
    }

    // Validate request body
    const parsedBody = PlacesSearchRequestBodySchema.parse(req.body)

    const requestBody = {
      textQuery: parsedBody.textQuery,
      locationBias: parsedBody.locationBias,
      pageSize: parsedBody.resultsQuantity
    }
    const results = await postTextSearchV1(requestBody)

    // Validate response
    const validatedResults = PlacesSearchResponseSchema.parse(results)
    res.json(validatedResults)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log('Validation error:', error)
      res.status(400).json({
        error: 'Invalid request data',
        details: error.errors
      })
    }

    console.error('Search error:', error)
    res.status(500).json({ error: 'Failed to search places' })
  }
}
