import { logger } from '@ritchy/logger'
import type {
  AutocompleteApiResponse,
  AutocompleteRequestBody,
} from '@ritchy/types'
import type { Request, Response } from 'express'
import { enqueueAutocompleteJob } from '../../internal/bullmq/jobs/google/places/queue'

export const postAutocomplete = async (
  req: Request<AutocompleteRequestBody>,
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
