/**
 * Captures pino logs during test execution and only displays them on failure.
 * Uses a global array that works across the vitest thread.
 */

// Global log storage that persists across imports
// Note: type must match packages/logger/src/index.ts declaration
declare global {
  var __testLogs: string[] | undefined
}

globalThis.__testLogs = globalThis.__testLogs || []

class LogCapture {
  start() {
    globalThis.__testLogs = []
  }

  stop() {
    // No-op, logs are stored globally
  }

  clear() {
    globalThis.__testLogs = []
  }

  /**
   * Add a log entry (called by the logger)
   */
  addLog(msg: string) {
    globalThis.__testLogs?.push(msg)
  }

  /**
   * Print captured logs (call this on test failure)
   */
  printLogs() {
    const logs = globalThis.__testLogs || []
    if (logs.length === 0) {
      console.error('\n📋 No API logs captured')
      return
    }

    console.error('\n📋 Captured API Logs:')
    console.error('─'.repeat(50))
    for (const log of logs) {
      console.error(log)
    }
    console.error('─'.repeat(50))
  }

  getLogs(): string[] {
    return [...(globalThis.__testLogs || [])]
  }
}

export const logCapture = new LogCapture()
