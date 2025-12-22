import { type DurationTimer, createCounter, createGauge } from '@ritchy/metrics'
import { metricsRegistry } from './registry'
import { getMetrics } from './singleton'

// ============================================
// TIMER UTILITIES FOR AGGREGATED HISTOGRAMS
// ============================================

/**
 * Simple histogram interface that our aggregated histograms implement
 */
export interface SimpleHistogram {
  observe: (value: number, labels: Record<string, string>) => void
}

/**
 * Create a duration timer for a simple histogram interface
 * Works with both prom-client Histogram and our aggregated histograms
 */
export const createSimpleDurationTimer = (
  histogram: SimpleHistogram,
): DurationTimer => {
  const startTime = process.hrtime()

  return {
    stop: (labels: Record<string, string> = {}) => {
      const [seconds, nanoseconds] = process.hrtime(startTime)
      const durationSeconds = seconds + nanoseconds / 1e9
      histogram.observe(durationSeconds, labels)
      return durationSeconds
    },
    elapsed: () => {
      const [seconds, nanoseconds] = process.hrtime(startTime)
      return seconds + nanoseconds / 1e9
    },
  }
}

// ============================================
// ENRICHMENT METRICS (aggregated across processes)
// Proxies to the auto-initializing singleton
// ============================================

export const enrichmentRequestsCounter = {
  inc: (labels: Record<string, string>, value = 1) =>
    getMetrics().enrichmentRequests.inc(labels, value),
}

export const enrichmentDurationHistogram = {
  observe: (value: number, labels: Record<string, string>) =>
    getMetrics().enrichmentDuration.observe(value, labels),
}

export const enrichmentErrorsCounter = {
  inc: (labels: Record<string, string>, value = 1) =>
    getMetrics().enrichmentErrors.inc(labels, value),
}

export const enrichmentStatusGauge = {
  inc: (labels: Record<string, string>, value = 1) =>
    getMetrics().enrichmentStatus.inc(labels, value),
  dec: (labels: Record<string, string>, value = 1) =>
    getMetrics().enrichmentStatus.dec(labels, value),
  set: (value: number, labels: Record<string, string>) =>
    getMetrics().enrichmentStatus.set(value, labels),
}

// ============================================
// QUEUE METRICS (aggregated across processes)
// Proxies to the auto-initializing singleton
// ============================================

export const queueJobsProcessedCounter = {
  inc: (labels: Record<string, string>, value = 1) =>
    getMetrics().queueJobsProcessed.inc(labels, value),
}

export const queueJobDurationHistogram = {
  observe: (value: number, labels: Record<string, string>) =>
    getMetrics().queueJobDuration.observe(value, labels),
}

export const queueJobsFailedCounter = {
  inc: (labels: Record<string, string>, value = 1) =>
    getMetrics().queueJobsFailed.inc(labels, value),
}

export const queueActiveJobsGauge = {
  inc: (labels: Record<string, string>, value = 1) =>
    getMetrics().queueActiveJobs.inc(labels, value),
  dec: (labels: Record<string, string>, value = 1) =>
    getMetrics().queueActiveJobs.dec(labels, value),
  set: (value: number, labels: Record<string, string>) =>
    getMetrics().queueActiveJobs.set(value, labels),
}

// ============================================
// EXTERNAL API METRICS (aggregated across processes)
// Proxies to the auto-initializing singleton
// ============================================

export const externalApiRequestsCounter = {
  inc: (labels: Record<string, string>, value = 1) =>
    getMetrics().externalApiRequests.inc(labels, value),
}

export const externalApiDurationHistogram = {
  observe: (value: number, labels: Record<string, string>) =>
    getMetrics().externalApiDuration.observe(value, labels),
}

// ============================================
// WEBSOCKET METRICS (API-only, local registry)
// ============================================

export const websocketConnectionsGauge = createGauge(
  metricsRegistry,
  'ritchy_websocket_connections',
  'Number of active WebSocket connections',
  ['namespace'],
)

export const websocketMessagesCounter = createCounter(
  metricsRegistry,
  'ritchy_websocket_messages_total',
  'Total number of WebSocket messages',
  ['namespace', 'event_type', 'direction'], // direction: inbound/outbound
)
