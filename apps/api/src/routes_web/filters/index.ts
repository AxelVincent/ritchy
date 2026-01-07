import express, { type Router } from 'express'
import { generateFilters } from './generate'

const filtersRouter: Router = express.Router()

// POST /filters/generate - Generate filters from natural language query
filtersRouter.post('/generate', generateFilters)

export default filtersRouter
