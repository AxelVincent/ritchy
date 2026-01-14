import express, { type Router } from 'express'
import { validateRequest } from '../../middleware/zodValidation'

import { GetUserPlaceFilterOptionsApiResponseSchema } from './filter-options/contract'
import { GetUserPlacePageApiResponseSchema } from './get-item-page/contract'
// Import contracts
import { GetUserPlacesApiResponseSchema } from './get/contract'
import { GetUserPlaceMarkersApiResponseSchema } from './markers/contract'

import { exportUserPlaces } from './export/export_csv'
import { getUserPlaceFilterOptions } from './filter-options/get-filter-options'
import { getItemPage } from './get-item-page/get-item-page'
// Import handlers
import { getUserPlaces } from './get/get-user-places'
import { getUserPlaceMarkers } from './markers/get-markers'

const userPlacesRouter: Router = express.Router()

// Main endpoint - get all user places with optional filtering/pagination
userPlacesRouter.get(
  '/',
  validateRequest({
    responseSchema: GetUserPlacesApiResponseSchema,
  }),
  getUserPlaces,
)

// Export endpoint - download all matching places as CSV
userPlacesRouter.get('/export', exportUserPlaces)

// Supporting endpoints
userPlacesRouter.get(
  '/markers',
  validateRequest({
    responseSchema: GetUserPlaceMarkersApiResponseSchema,
  }),
  getUserPlaceMarkers,
)

userPlacesRouter.get(
  '/filter-options',
  validateRequest({
    responseSchema: GetUserPlaceFilterOptionsApiResponseSchema,
  }),
  getUserPlaceFilterOptions,
)

userPlacesRouter.get(
  '/items/:itemId/page',
  validateRequest({
    responseSchema: GetUserPlacePageApiResponseSchema,
  }),
  getItemPage,
)

export default userPlacesRouter
