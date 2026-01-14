import { logger } from '@ritchy/logger'
import type { Request, Response } from 'express'
import { enqueueAutocompleteJob } from '../../../internal/bullmq/jobs/google/places/queue'
import type {
  AutocompleteApiResponse,
  AutocompleteRequestBody,
} from './contract'

export const autocompleteHandler = async (
  req: Request<
    Record<string, never>,
    AutocompleteApiResponse,
    AutocompleteRequestBody
  >,
  res: Response<AutocompleteApiResponse>,
) => {
  try {
    const predictions = await enqueueAutocompleteJob(req.body)
    res.json({ predictions })
  } catch (error) {
    logger.error({
      msg: 'Error fetching autocomplete predictions',
      event: 'autocomplete_error',
      metadata: { error },
    })
    res.status(500).json({ predictions: [] })
  }
}
