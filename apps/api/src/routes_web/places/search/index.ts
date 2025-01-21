import express, { type Router } from 'express'
import { searchPlaces } from './search'

const searchRouter: Router = express.Router()

searchRouter.post('/', searchPlaces)

export default searchRouter
