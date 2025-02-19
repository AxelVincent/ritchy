import express, { type Router } from 'express'
import { enrichWebsite } from './enrich'
import listsRouter from './lists'
import notesRouter from './notes'
import paymentsRouter from './payments'
import searchesRouter from './searches'
import usersRouter from './users'
const router: Router = express.Router()

// Places routes
router.get('/enrich', enrichWebsite)

// Lists routes
router.use('/lists', listsRouter)

// Searches routes
router.use('/searches', searchesRouter)

// Notes routes
router.use('/notes', notesRouter)

// Payments routes
router.use('/payments', paymentsRouter)

// Users routes
router.use('/users', usersRouter)

export default router
