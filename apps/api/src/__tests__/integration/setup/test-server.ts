import express, { type Express } from 'express'
import userPlacesRouter from '../../../routes_web/user-places'
import { getTestDb } from './test-database'

let app: Express | null = null

/**
 * Setup test server with minimal middleware for integration tests.
 * Uses a mock auth that reads user ID from X-Test-User-Id header.
 */
export const setupTestServer = () => {
  app = express()

  // JSON parsing
  app.use(express.json())

  // Mock auth middleware that reads user from header
  app.use((req, _res, next) => {
    const userId = req.headers['x-test-user-id'] as string | undefined
    req.auth = {
      userId: userId ?? '',
      sessionId: 'test-session',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      clerkId: 'test-clerk-id',
      token: 'test-token',
    }
    next()
  })

  // Inject test database
  app.use((_req, res, next) => {
    res.locals.db = getTestDb()
    next()
  })

  // Mount user-places routes
  app.use('/user-places', userPlacesRouter)

  return app
}

export const getTestApp = () => {
  if (!app)
    throw new Error(
      'Test server not initialized. Call setupTestServer() first.',
    )
  return app
}
