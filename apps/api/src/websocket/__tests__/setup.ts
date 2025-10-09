import { vi } from 'vitest'

// Mock all configuration modules
vi.mock('../../config/clerk', () => ({
  CLERK_CONFIG: {
    API_KEYS: {
      SECRET_KEY: 'test-secret-key',
      PUBLISHABLE_KEY: 'test-publishable-key',
    },
    WEBHOOK_SECRET: 'test-webhook-secret',
  },
}))

vi.mock('../../config/drizzle', () => ({
  DRIZZLE_CONFIG: {
    CONNECTION_STRING: 'postgresql://test:test@localhost:5432/test',
    MAX_CONNECTIONS: 10,
    MIN_CONNECTIONS: 2,
  },
}))

vi.mock('../../config/redis', () => ({
  REDIS_CONFIG: {
    URL: 'redis://localhost:6379',
    PUBLIC_URL: 'redis://localhost:6379',
  },
}))

vi.mock('@ritchy/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    runWithContext: vi.fn((_ctx, fn) => fn()),
  },
  baseLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))
