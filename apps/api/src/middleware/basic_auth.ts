import { logger } from '@ritchy/logger'
import type { NextFunction } from 'express'
import type { Request, Response } from 'express'
import { BASIC_AUTH_CONFIG } from '../config/basic_auth'

export const basicAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Add explicit return type
  const authHeader = req.headers.authorization

  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic')
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  const auth = Buffer.from(authHeader.split(' ')[1], 'base64')
    .toString()
    .split(':')
  const username = auth[0]
  const password = auth[1]

  if (
    username === BASIC_AUTH_CONFIG.username &&
    password === BASIC_AUTH_CONFIG.password
  ) {
    next()
    return
  }

  logger.warn({
    msg: 'Invalid credentials',
    event: 'invalid_credentials',
    metadata: {
      username,
      password: `${password.slice(0, 4)}...`,
    },
  })

  res.setHeader('WWW-Authenticate', 'Basic')
  res.status(401).json({ error: 'Invalid credentials' })
  return
}
