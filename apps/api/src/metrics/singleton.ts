import { isMainThread, threadId } from 'node:worker_threads'
import {
  type RedisAggregatedRegistry,
  createRedisAggregatedRegistry,
} from '@ritchy/metrics'
import { redisClient } from '../internal/redis/redis'
import { localRegistry } from './registry'

/**
 * Auto-initializing singleton for aggregated metrics.
 *
 * This module provides a single entry point for all cross-process metrics.
 * Metrics are automatically initialized on first access, eliminating the need
 * for explicit initialization in sandboxed workers or other processes.
 *
 * Usage:
 *   import { getMetrics } from './singleton'
 *   getMetrics().externalApiRequests.inc({ service: 'foo', endpoint: 'bar', status_code: '200' })
 */

let _registry: RedisAggregatedRegistry | null = null

interface AggregatedMetrics {
  // External API metrics
  externalApiRequests: ReturnType<RedisAggregatedRegistry['createCounter']>
  externalApiDuration: ReturnType<RedisAggregatedRegistry['createHistogram']>

  // Enrichment metrics
  enrichmentRequests: ReturnType<RedisAggregatedRegistry['createCounter']>
  enrichmentDuration: ReturnType<RedisAggregatedRegistry['createHistogram']>
  enrichmentErrors: ReturnType<RedisAggregatedRegistry['createCounter']>
  enrichmentStatus: ReturnType<RedisAggregatedRegistry['createGauge']>

  // Queue metrics
  queueJobsProcessed: ReturnType<RedisAggregatedRegistry['createCounter']>
  queueJobDuration: ReturnType<RedisAggregatedRegistry['createHistogram']>
  queueJobsFailed: ReturnType<RedisAggregatedRegistry['createCounter']>
  queueActiveJobs: ReturnType<RedisAggregatedRegistry['createGauge']>
}

let _metrics: AggregatedMetrics | null = null

/**
 * Generate a unique process ID for metrics aggregation.
 * Detects if running in a worker thread (BullMQ sandbox) vs main thread.
 */
const getProcessId = (): string => {
  if (!isMainThread) {
    return `sandbox-${process.pid}-${threadId}`
  }
  // Check for explicit worker ID (set by worker process)
  if (process.env.WORKER_ID) {
    return process.env.WORKER_ID
  }
  return `api-${process.pid}`
}

/**
 * Get the aggregated metrics singleton.
 * Auto-initializes on first access, including Redis connection and sync loop.
 */
export const getMetrics = (): AggregatedMetrics => {
  if (_metrics) return _metrics

  // Auto-initialize registry on first access
  _registry = createRedisAggregatedRegistry({
    redis: redisClient.redis,
    processId: getProcessId(),
    keyPrefix: 'metrics:ritchy',
    ttl: 120,
    syncInterval: 5000,
  })

  // Attach local registry for Node.js default metrics (only in main API process)
  if (isMainThread && !process.env.WORKER_ID) {
    _registry.setLocalRegistry(localRegistry)
  }

  // Create all aggregated metrics
  _metrics = {
    // External API metrics (worker + API)
    externalApiRequests: _registry.createCounter(
      'ritchy_external_api_requests_total',
      'Total number of external API requests',
      ['service', 'endpoint', 'status_code'],
    ),
    externalApiDuration: _registry.createHistogram(
      'ritchy_external_api_duration_seconds',
      'Duration of external API requests',
      ['service', 'endpoint'],
      [0.1, 0.5, 1, 2, 5, 10, 30],
    ),

    // Enrichment metrics (worker + API)
    enrichmentRequests: _registry.createCounter(
      'ritchy_enrichment_requests_total',
      'Total number of enrichment requests',
      ['enrichment_type', 'status', 'cached'],
    ),
    enrichmentDuration: _registry.createHistogram(
      'ritchy_enrichment_duration_seconds',
      'Duration of enrichment operations',
      ['enrichment_type', 'subprocess', 'cached'],
      [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
    ),
    enrichmentErrors: _registry.createCounter(
      'ritchy_enrichment_errors_total',
      'Total number of enrichment errors',
      ['enrichment_type', 'error_type'],
    ),
    enrichmentStatus: _registry.createGauge(
      'ritchy_enrichment_active',
      'Number of active enrichments by status',
      ['status'],
      'sum',
    ),

    // Queue metrics (worker)
    queueJobsProcessed: _registry.createCounter(
      'ritchy_queue_jobs_processed_total',
      'Total number of queue jobs processed',
      ['queue_name', 'job_type', 'status'],
    ),
    queueJobDuration: _registry.createHistogram(
      'ritchy_queue_job_duration_seconds',
      'Duration of queue job processing',
      ['queue_name', 'job_type'],
      [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
    ),
    queueJobsFailed: _registry.createCounter(
      'ritchy_queue_jobs_failed_total',
      'Total number of failed queue jobs',
      ['queue_name', 'job_type', 'error_type'],
    ),
    queueActiveJobs: _registry.createGauge(
      'ritchy_queue_active_jobs',
      'Number of currently active jobs in queue',
      ['queue_name'],
      'sum',
    ),
  }

  // Auto-start sync loop
  _registry.startSync()

  return _metrics
}

/**
 * Get the underlying registry for the /metrics endpoint.
 * Returns null if metrics haven't been accessed yet.
 */
export const getRegistry = (): RedisAggregatedRegistry | null => _registry

/**
 * Ensure the registry is initialized (for /metrics endpoint).
 * Call this at API startup to ensure metrics are ready to serve.
 */
export const ensureRegistryInitialized = (): RedisAggregatedRegistry => {
  getMetrics() // Force initialization
  if (!_registry) {
    throw new Error('Registry failed to initialize')
  }
  return _registry
}
