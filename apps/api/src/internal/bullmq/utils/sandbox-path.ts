import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Gets the path to a sandboxed processor file for BullMQ worker threads.
 *
 * All workers run with useWorkerThreads enabled for memory isolation.
 * The compiled .js files are used as the processor path.
 *
 * Since tsup bundles the workers into dist/workers/index.js, we calculate
 * the dist root from the current file's location and build the sandbox path.
 *
 * @param relativePath - Path relative to the bullmq directory (e.g., 'jobs/enrichment/sandbox')
 * @returns Absolute path to the compiled .js file
 */
export const getSandboxPath = (relativePath: string): string => {
  // Get the directory containing the current file (dist/workers when bundled)
  const currentDir = dirname(fileURLToPath(import.meta.url))
  // Go up to dist root (from dist/workers to dist)
  const distRoot = join(currentDir, '..')
  // Build the full path to the sandbox file
  return join(distRoot, 'internal/bullmq', `${relativePath}.js`)
}
