import express, { type Router } from 'express'
import mappingsRouter from './mappings'
import oauthRouter from './oauth/'
import syncRouter from './sync'

const hubspotRouter: Router = express.Router()

hubspotRouter.use('/oauth', oauthRouter)
hubspotRouter.use('/mappings', mappingsRouter)
hubspotRouter.use('/sync', syncRouter)

export default hubspotRouter
