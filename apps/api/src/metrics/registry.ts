import { createMetricsRegistry } from '@ritchy/metrics'

export const metricsRegistry = createMetricsRegistry({
  prefix: 'ritchy_',
  defaultLabels: {
    app: 'ritchy',
    environment: process.env.NODE_ENV || 'development',
  },
  collectDefaultMetrics: true,
})
