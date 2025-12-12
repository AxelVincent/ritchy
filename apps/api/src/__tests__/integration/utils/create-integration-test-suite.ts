import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '../setup/test-database'
import { setupTestServer } from '../setup/test-server'
import { cleanupManager } from './cleanup-manager'
import { logCapture } from './log-capture'

interface TestCase {
  when: string
  should: string
  run: () => Promise<void>
}

interface SuiteConfig {
  name: string
}

export const createIntegrationTestSuite = (
  config: SuiteConfig,
  ...cases: TestCase[]
) => {
  describe(config.name, () => {
    beforeAll(async () => {
      await setupTestDatabase()
      setupTestServer()
    })

    afterAll(async () => {
      await teardownTestDatabase()
      logCapture.stop()
    })

    // Start capturing logs before each test
    beforeEach(() => {
      logCapture.start()
      logCapture.clear()
    })

    // Auto cleanup after each test
    afterEach(async () => {
      logCapture.stop()
      await cleanupManager.cleanup()
    })

    for (const testCase of cases) {
      it(`WHEN ${testCase.when} SHOULD ${testCase.should}`, async () => {
        try {
          await testCase.run()
        } catch (error) {
          // Print captured logs on failure
          logCapture.printLogs()
          throw error
        }
      })
    }
  })
}
