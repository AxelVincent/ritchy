import type { Server as HTTPServer } from 'node:http'
import { verifyToken } from '@clerk/express'
import { logger } from '@ritchy/logger'
import { type Socket, Server as SocketIOServer } from 'socket.io'
import { CLERK_CONFIG } from '../config/clerk'
import { websocketConnectionsGauge } from '../metrics/collectors'

/**
 * Create and configure WebSocket server with Socket.IO
 * Single-server mode (Redis adapter disabled due to ACL permissions)
 */
/**
 * Authentication middleware for Socket.IO
 * Verifies Clerk JWT token and stores user ID in socket data
 * Can be applied to main namespace or sub-namespaces
 */
export const authenticationMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void,
) => {
  const token = socket.handshake.auth.token

  if (!token) {
    logger.warn({
      msg: 'WebSocket connection attempt without token',
      event: 'websocket_auth_no_token',
      metadata: { socketId: socket.id },
    })
    return next(new Error('Authentication token required'))
  }

  try {
    // Verify JWT token signature using Clerk's verification
    // This validates the token's cryptographic signature and expiration
    // Use centralized CLERK_CONFIG for consistency across the application
    const verifiedToken = await verifyToken(token, {
      secretKey: CLERK_CONFIG.API_KEYS.SECRET_KEY,
    })

    logger.debug({
      msg: 'Token verification result',
      event: 'websocket_token_verified',
      metadata: {
        socketId: socket.id,
        tokenKeys: Object.keys(verifiedToken),
        hasSub: 'sub' in verifiedToken,
        subValue: verifiedToken.sub,
        tokenType: typeof verifiedToken,
      },
    })

    if (!verifiedToken.sub) {
      throw new Error('Token missing subject')
    }

    // Store Clerk userId in socket data for authorization checks
    socket.data.userId = verifiedToken.sub

    logger.debug({
      msg: 'WebSocket authentication successful',
      event: 'websocket_auth_success',
      metadata: {
        socketId: socket.id,
        userId: verifiedToken.sub,
        socketDataUserId: socket.data.userId,
      },
    })

    next()
  } catch (error) {
    logger.error({
      msg: 'WebSocket authentication failed',
      event: 'websocket_auth_failed',
      metadata: {
        socketId: socket.id,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    next(new Error('Authentication failed'))
  }
}

export const createWebSocketServer = (httpServer: HTTPServer) => {
  const io = new SocketIOServer(httpServer, {
    // Add path configuration for proxy support
    path: '/socket.io', // This is the default, but explicitly set it
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket'], // Fallback to polling if WebSocket fails
    pingTimeout: 60000, // 60s timeout for ping/pong
    pingInterval: 25000, // Send ping every 25s
    maxHttpBufferSize: 1e6, // 1MB max message size
    allowEIO3: true, // Support older clients
  })

  // Apply authentication middleware to main namespace
  io.use(authenticationMiddleware)

  // Global error handler
  io.on('error', (error) => {
    logger.error({
      msg: 'WebSocket server error',
      event: 'websocket_server_error',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    })
  })

  // Connection event (fires for main namespace)
  io.on('connection', (socket) => {
    // Increment connection gauge
    websocketConnectionsGauge.inc({ namespace: 'main' })

    logger.info({
      msg: 'Client connected to WebSocket server',
      event: 'websocket_connection',
      metadata: { socketId: socket.id, userId: socket.data.userId },
    })

    socket.on('disconnect', (reason) => {
      // Decrement connection gauge
      websocketConnectionsGauge.dec({ namespace: 'main' })

      logger.info({
        msg: 'Client disconnected from WebSocket server',
        event: 'websocket_disconnection',
        metadata: { socketId: socket.id, reason },
      })
    })
  })

  logger.info({
    msg: 'WebSocket server initialized',
    event: 'websocket_server_initialized',
  })

  return io
}
