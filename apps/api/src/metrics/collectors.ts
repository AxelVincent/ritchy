import { createCounter, createGauge, createHistogram } from '@ritchy/metrics'
import { metricsRegistry } from './registry'

// ============================================
// USER METRICS
// ============================================

export const activeUsersGauge = createGauge(
  metricsRegistry,
  'ritchy_active_users',
  'Number of currently active users',
)

export const userOperationsCounter = createCounter(
  metricsRegistry,
  'ritchy_user_operations_total',
  'Total number of user operations',
  ['operation_type', 'status'],
)

// ============================================
// ENRICHMENT METRICS
// ============================================

export const enrichmentRequestsCounter = createCounter(
  metricsRegistry,
  'ritchy_enrichment_requests_total',
  'Total number of enrichment requests',
  ['enrichment_type', 'status', 'cached'],
)

export const enrichmentDurationHistogram = createHistogram(
  metricsRegistry,
  'ritchy_enrichment_duration_seconds',
  'Duration of enrichment operations',
  ['enrichment_type', 'subprocess', 'cached'],
  [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300], // Up to 5 minutes
)

export const enrichmentErrorsCounter = createCounter(
  metricsRegistry,
  'ritchy_enrichment_errors_total',
  'Total number of enrichment errors',
  ['enrichment_type', 'error_type'],
)

export const enrichmentStatusGauge = createGauge(
  metricsRegistry,
  'ritchy_enrichment_active',
  'Number of active enrichments by status',
  ['status'], // queued, processing, completed, failed
)

// ============================================
// DATABASE METRICS
// ============================================

export const databaseQueriesCounter = createCounter(
  metricsRegistry,
  'ritchy_database_queries_total',
  'Total number of database queries',
  ['operation', 'table'],
)

export const databaseQueryDurationHistogram = createHistogram(
  metricsRegistry,
  'ritchy_database_query_duration_seconds',
  'Duration of database queries',
  ['operation', 'table'],
  [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
)

// ============================================
// QUEUE METRICS (BullMQ)
// ============================================

export const queueJobsProcessedCounter = createCounter(
  metricsRegistry,
  'ritchy_queue_jobs_processed_total',
  'Total number of queue jobs processed',
  ['queue_name', 'job_type', 'status'],
)

export const queueJobDurationHistogram = createHistogram(
  metricsRegistry,
  'ritchy_queue_job_duration_seconds',
  'Duration of queue job processing',
  ['queue_name', 'job_type'],
  [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
)

export const queueJobsFailedCounter = createCounter(
  metricsRegistry,
  'ritchy_queue_jobs_failed_total',
  'Total number of failed queue jobs',
  ['queue_name', 'job_type', 'error_type'],
)

export const queueActiveJobsGauge = createGauge(
  metricsRegistry,
  'ritchy_queue_active_jobs',
  'Number of currently active jobs in queue',
  ['queue_name'],
)

// ============================================
// WEBSOCKET METRICS
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

// ============================================
// EXTERNAL API METRICS
// ============================================

export const externalApiRequestsCounter = createCounter(
  metricsRegistry,
  'ritchy_external_api_requests_total',
  'Total number of external API requests',
  ['service', 'endpoint', 'status_code'],
)

export const externalApiDurationHistogram = createHistogram(
  metricsRegistry,
  'ritchy_external_api_duration_seconds',
  'Duration of external API requests',
  ['service', 'endpoint'],
  [0.1, 0.5, 1, 2, 5, 10, 30],
)
