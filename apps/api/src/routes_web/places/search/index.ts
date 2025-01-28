import express, { type Router } from 'express'
// import { searchPlaces } from './search'

const searchRouter: Router = express.Router()

searchRouter.post('/')

export default searchRouter
