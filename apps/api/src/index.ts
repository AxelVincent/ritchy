import 'dotenv/config'
import {
	SearchRequestBodySchema,
	SearchResponseSchema
} from '@ritchy/types/src/places'
import cors from 'cors'
import express, { type Request, type Response } from 'express'
import { z } from 'zod'
import { legacyTextSearch } from './external/gmap_text_search'

const app = express()

app.use(
	cors({
		origin: process.env.CORS_ORIGIN || '*',
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization']
	})
)

app.use(express.json())

app.post('/api/places/search', async (req: Request, res: Response) => {
	try {
		// Validate request body
		const parsedBody = SearchRequestBodySchema.parse(req.body)

		const results = await legacyTextSearch(
			parsedBody.query,
			{ center: parsedBody.center, radius: parsedBody.radius },
			parsedBody.pageToken
		)

		// Validate response
		const validatedResults = SearchResponseSchema.parse(results)
		res.json(validatedResults)
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				error: 'Invalid request data',
				details: error.errors
			})
		}
		console.error('Search error:', error)
		res.status(500).json({ error: 'Failed to search places' })
	}
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`)
})
