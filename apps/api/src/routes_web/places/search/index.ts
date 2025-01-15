import express, { type Router } from 'express'
import { searchPlaces } from '../search'

const searchRouter: Router = express.Router()

searchRouter.get('/search', searchPlaces)

export default searchRouter
