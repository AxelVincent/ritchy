import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'src/__tests__/integration/**/*.test.ts',
      'src/routes_web/**/__tests__/**/*.test.ts',
    ],
    setupFiles: ['src/__tests__/integration/setup/env.ts'],
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    // Use threads with single thread for sequential execution + visible logs
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    // Show console output during tests
    reporters: ['verbose'],
    // Print stdout/stderr from failed tests
    printConsoleTrace: true,
    // Don't silence console output
    onConsoleLog: () => true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
