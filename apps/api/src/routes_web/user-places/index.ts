import {
  GetUserPlaceFilterOptionsApiResponseSchema,
  GetUserPlaceMarkersApiResponseSchema,
  GetUserPlacePageApiResponseSchema,
  GetUserPlacesApiResponseSchema,
} from '@ritchy/types'
import express, { type Router } from 'express'
import { validateRequest } from '../../middleware/zodValidation'
import { exportUserPlaces } from './export/export_csv'
import { getUserPlaceFilterOptions } from './get_filter_options/get_filter_options'
import { getItemPage } from './get_item_page'
import { getUserPlaceMarkers } from './get_markers/get_markers'
import { getUserPlaces } from './get_user_places/get_user_places'

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
