import express, { type Router } from 'express'
import { updateStatus } from './update'

const statusRouter: Router = express.Router()

statusRouter.put('/:placeId', updateStatus)

export default statusRouter
