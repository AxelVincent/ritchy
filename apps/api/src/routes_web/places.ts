import {
  type SearchRequestBody,
  SearchRequestBodySchema,
  TextSearchResponseSchema
} from '@ritchy/types/src/places'
import type { Request, Response } from 'express'
import { postTextSearchV1 } from 'src/external/google_maps/text_search_V1'
import { z } from 'zod'

export const searchPlaces = async (req: Request, res: Response) => {
  try {
    // Validate request body
    console.log('req.body', req.body)
    console.log('LocationBias', req.body.locationBias)
    const parsedBody = SearchRequestBodySchema.parse(req.body)

    const requestBody: SearchRequestBody = {
      textQuery: parsedBody.textQuery,
      locationBias: parsedBody.locationBias,
      pageSize: parsedBody.pageSize
    }

    const results = await postTextSearchV1(requestBody)

    // Validate response
    const validatedResults = TextSearchResponseSchema.parse(results)
    res.json(validatedResults)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log('Validation error:', error)
      res.status(400).json({
        error: 'Invalid request data',
        details: error.errors
      })
      return
    }

    console.error('Search error:', error)
    res.status(500).json({ error: 'Failed to search places' })
  }
}
