import { createMetricsRegistry } from '@ritchy/metrics'

/**
 * Local prom-client registry for Node.js default metrics.
 * Each process has its own instance for process-specific metrics.
 *
 * This is used by:
 * - HTTP metrics middleware (request duration, size, etc.)
 * - Local-only metrics (websocket connections, active users, etc.)
 *
 * For cross-process aggregated metrics (enrichment, queue, external API),
 * use the singleton from ./singleton.ts instead.
 */
export const localRegistry = createMetricsRegistry({
  prefix: 'ritchy_',
  defaultLabels: {
    app: 'ritchy',
    environment: process.env.NODE_ENV || 'development',
  },
  collectDefaultMetrics: true,
})

// Legacy export for backward compatibility (used by HTTP middleware)
export const metricsRegistry = localRegistry
