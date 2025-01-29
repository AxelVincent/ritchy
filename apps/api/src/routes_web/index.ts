import express, { type Router } from 'express'
import { enrichWebsite } from './enrich'
import listsRouter from './lists'
import notesRouter from './notes'
import searchesRouter from './searches'

const router: Router = express.Router()

// Places routes
router.get('/enrich', enrichWebsite)

// Lists routes
router.use('/lists', listsRouter)

// Searches routes
router.use('/searches', searchesRouter)

// Notes routes
router.use('/notes', notesRouter)

export default router
