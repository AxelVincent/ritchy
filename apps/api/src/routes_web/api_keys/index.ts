import { Router, type Router as RouterType } from 'express'
import { validateRequest } from '../../middleware/zodValidation'

// Import contracts
import {
  GetApiActivityApiResponseSchema,
  GetApiActivityQuerySchema,
} from './activity/contract'
import {
  CreateApiKeyApiResponseSchema,
  CreateApiKeyRequestSchema,
} from './create/contract'
import { GetApiKeySecretApiResponseSchema } from './get-secret/contract'
import { GetApiUsageApiResponseSchema } from './get-usage/contract'
import { ListApiKeysApiResponseSchema } from './list/contract'
import { RevokeApiKeyApiResponseSchema } from './revoke/contract'

// Import handlers
import { getApiActivityHandler } from './activity/activity'
import { createApiKeyHandler } from './create/create'
import { getApiKeySecretHandler } from './get-secret/get-secret'
import { getApiUsageHandler } from './get-usage/get-usage'
import { listApiKeysHandler } from './list/list'
import { revokeApiKeyHandler } from './revoke/revoke'

const apiKeysRouter: RouterType = Router()

// POST /web/api-keys - Create a new API key
apiKeysRouter.post(
  '/',
  validateRequest({
    bodySchema: CreateApiKeyRequestSchema,
    responseSchema: CreateApiKeyApiResponseSchema,
  }),
  createApiKeyHandler,
)

// GET /web/api-keys - List all API keys for the user
apiKeysRouter.get(
  '/',
  validateRequest({
    responseSchema: ListApiKeysApiResponseSchema,
  }),
  listApiKeysHandler,
)

// GET /web/api-keys/usage - Get usage statistics (must be before :id route)
apiKeysRouter.get(
  '/usage',
  validateRequest({
    responseSchema: GetApiUsageApiResponseSchema,
  }),
  getApiUsageHandler,
)

// GET /web/api-keys/activity - Get paginated activity log (must be before :id route)
apiKeysRouter.get(
  '/activity',
  validateRequest({
    querySchema: GetApiActivityQuerySchema,
    responseSchema: GetApiActivityApiResponseSchema,
  }),
  getApiActivityHandler,
)

// GET /web/api-keys/:id/secret - Get decrypted API key
apiKeysRouter.get(
  '/:id/secret',
  validateRequest({
    responseSchema: GetApiKeySecretApiResponseSchema,
  }),
  getApiKeySecretHandler,
)

// DELETE /web/api-keys/:id - Revoke an API key
apiKeysRouter.delete(
  '/:id',
  validateRequest({
    responseSchema: RevokeApiKeyApiResponseSchema,
  }),
  revokeApiKeyHandler,
)

export default apiKeysRouter
