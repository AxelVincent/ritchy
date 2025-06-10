import {
  GetCompanyMappingsResponseSchema,
  GetCompanyPropertiesResponseSchema,
  GetContactMappingsResponseSchema,
  GetContactPropertiesResponseSchema,
  ResetMappingResponseSchema,
  UpdateCompanyMappingBodySchema,
  UpdateCompanyMappingResponseSchema,
  UpdateContactMappingBodySchema,
  UpdateContactMappingResponseSchema,
} from '@ritchy/types'
import express, { type Router } from 'express'
import { validateRequest } from '../../../middleware/zodValidation'
import {
  getCompanyMappings,
  getCompanyProperties,
  resetCompanyMappings,
  updateCompanyMapping,
} from './company'
import {
  getContactMappings,
  getContactProperties,
  resetContactMappings,
  updateContactMapping,
} from './contact'

const mappingsRouter: Router = express.Router()

// Company mapping routes
mappingsRouter.get(
  '/company',
  validateRequest({
    responseSchema: GetCompanyMappingsResponseSchema,
  }),
  getCompanyMappings,
)

mappingsRouter.put(
  '/company',
  validateRequest({
    bodySchema: UpdateCompanyMappingBodySchema,
    responseSchema: UpdateCompanyMappingResponseSchema,
  }),
  updateCompanyMapping,
)

mappingsRouter.post(
  '/company/reset',
  validateRequest({
    responseSchema: ResetMappingResponseSchema,
  }),
  resetCompanyMappings,
)

mappingsRouter.get(
  '/company/properties',
  validateRequest({
    responseSchema: GetCompanyPropertiesResponseSchema,
  }),
  getCompanyProperties,
)

// Contact mapping routes
mappingsRouter.get(
  '/contact',
  validateRequest({
    responseSchema: GetContactMappingsResponseSchema,
  }),
  getContactMappings,
)

mappingsRouter.put(
  '/contact',
  validateRequest({
    bodySchema: UpdateContactMappingBodySchema,
    responseSchema: UpdateContactMappingResponseSchema,
  }),
  updateContactMapping,
)

mappingsRouter.post(
  '/contact/reset',
  validateRequest({
    responseSchema: ResetMappingResponseSchema,
  }),
  resetContactMappings,
)

mappingsRouter.get(
  '/contact/properties',
  validateRequest({
    responseSchema: GetContactPropertiesResponseSchema,
  }),
  getContactProperties,
)

export default mappingsRouter
