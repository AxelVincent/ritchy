import './setup'
import { verifyToken } from '@clerk/express'
import { logger } from '@ritchy/logger'
import type { Socket } from 'socket.io'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authenticationMiddleware } from '../server'

// Mock additional dependencies
vi.mock('@clerk/express')

describe('WebSocket Authentication Middleware', () => {
  let mockSocket: Socket
  let mockNext: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock socket object
    mockSocket = {
      id: 'test-socket-id',
      handshake: {
        auth: {
          token: null,
        },
      },
      data: {},
    } as unknown as Socket

    // Mock next function
    mockNext = vi.fn()
  })

  describe('Token Validation', () => {
    it('should reject connection without token', async () => {
      // No token provided
      mockSocket.handshake.auth.token = null

      await authenticationMiddleware(mockSocket, mockNext)

      expect(logger.warn).toHaveBeenCalledWith({
        msg: 'WebSocket connection attempt without token',
        event: 'websocket_auth_no_token',
        metadata: { socketId: 'test-socket-id' },
      })

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication token required',
        }),
      )
    })

    it('should accept connection with valid token', async () => {
      const validToken = 'valid-jwt-token'
      mockSocket.handshake.auth.token = validToken

      // Mock successful token verification
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      vi.mocked(verifyToken as any).mockResolvedValue({
        sub: 'user_123',
      })

      await authenticationMiddleware(mockSocket, mockNext)

      expect(verifyToken).toHaveBeenCalledWith(validToken, {
        secretKey: expect.any(String),
      })

      expect(mockSocket.data.userId).toBe('user_123')

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'WebSocket authentication successful',
          event: 'websocket_auth_success',
        }),
      )

      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should reject connection with invalid token', async () => {
      const invalidToken = 'invalid-jwt-token'
      mockSocket.handshake.auth.token = invalidToken

      // Mock token verification failure
      vi.mocked(verifyToken).mockRejectedValue(
        new Error('Invalid token signature'),
      )

      await authenticationMiddleware(mockSocket, mockNext)

      expect(logger.error).toHaveBeenCalledWith({
        msg: 'WebSocket authentication failed',
        event: 'websocket_auth_failed',
        metadata: {
          socketId: 'test-socket-id',
          error: 'Invalid token signature',
        },
      })

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication failed',
        }),
      )
    })

    it('should reject connection with expired token', async () => {
      const expiredToken = 'expired-jwt-token'
      mockSocket.handshake.auth.token = expiredToken

      vi.mocked(verifyToken).mockRejectedValue(new Error('Token expired'))

      await authenticationMiddleware(mockSocket, mockNext)

      expect(logger.error).toHaveBeenCalledWith({
        msg: 'WebSocket authentication failed',
        event: 'websocket_auth_failed',
        metadata: {
          socketId: 'test-socket-id',
          error: 'Token expired',
        },
      })

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication failed',
        }),
      )
    })

    it('should reject connection when token missing subject', async () => {
      mockSocket.handshake.auth.token = 'valid-token-no-subject'

      // Token valid but missing 'sub' claim
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      vi.mocked(verifyToken).mockResolvedValue({} as any)

      await authenticationMiddleware(mockSocket, mockNext)

      expect(logger.error).toHaveBeenCalledWith({
        msg: 'WebSocket authentication failed',
        event: 'websocket_auth_failed',
        metadata: {
          socketId: 'test-socket-id',
          error: 'Token missing subject',
        },
      })

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication failed',
        }),
      )
    })
  })

  describe('User ID Storage', () => {
    it('should store userId in socket.data after successful authentication', async () => {
      mockSocket.handshake.auth.token = 'valid-token'

      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'user_456',
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      } as any)

      await authenticationMiddleware(mockSocket, mockNext)

      expect(mockSocket.data.userId).toBe('user_456')
      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should not store userId on failed authentication', async () => {
      mockSocket.handshake.auth.token = 'invalid-token'

      vi.mocked(verifyToken).mockRejectedValue(new Error('Invalid token'))

      await authenticationMiddleware(mockSocket, mockNext)

      expect(mockSocket.data.userId).toBeUndefined()
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string token', async () => {
      mockSocket.handshake.auth.token = ''

      await authenticationMiddleware(mockSocket, mockNext)

      expect(logger.warn).toHaveBeenCalledWith({
        msg: 'WebSocket connection attempt without token',
        event: 'websocket_auth_no_token',
        metadata: { socketId: 'test-socket-id' },
      })

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication token required',
        }),
      )
    })

    it('should handle malformed token gracefully', async () => {
      mockSocket.handshake.auth.token = 'not-a-jwt'

      vi.mocked(verifyToken).mockRejectedValue(new Error('Malformed JWT'))

      await authenticationMiddleware(mockSocket, mockNext)

      expect(logger.error).toHaveBeenCalledWith({
        msg: 'WebSocket authentication failed',
        event: 'websocket_auth_failed',
        metadata: {
          socketId: 'test-socket-id',
          error: 'Malformed JWT',
        },
      })
    })

    it('should handle network errors during token verification', async () => {
      mockSocket.handshake.auth.token = 'valid-token'

      vi.mocked(verifyToken).mockRejectedValue(new Error('Network timeout'))

      await authenticationMiddleware(mockSocket, mockNext)

      expect(logger.error).toHaveBeenCalledWith({
        msg: 'WebSocket authentication failed',
        event: 'websocket_auth_failed',
        metadata: {
          socketId: 'test-socket-id',
          error: 'Network timeout',
        },
      })
    })
  })

  describe('Security', () => {
    it('should not expose token in logs', async () => {
      const sensitiveToken = 'secret-jwt-token-with-sensitive-data'
      mockSocket.handshake.auth.token = sensitiveToken

      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'user_789',
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      } as any)

      await authenticationMiddleware(mockSocket, mockNext)

      // Ensure token itself is not logged
      expect(logger.debug).not.toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            token: sensitiveToken,
          }),
        }),
      )
    })

    it('should log userId after successful authentication for audit trail', async () => {
      mockSocket.handshake.auth.token = 'valid-token'

      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'user_audit_123',
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      } as any)

      await authenticationMiddleware(mockSocket, mockNext)

      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'WebSocket authentication successful',
          event: 'websocket_auth_success',
          metadata: expect.objectContaining({
            userId: 'user_audit_123',
          }),
        }),
      )
    })
  })
})
