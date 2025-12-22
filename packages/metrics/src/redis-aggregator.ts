import type { Registry } from 'prom-client'

/**
 * Redis client interface - compatible with ioredis
 */
export interface RedisClient {
  hset(key: string, field: string, value: string): Promise<number>
  hget(key: string, field: string): Promise<string | null>
  hgetall(key: string): Promise<Record<string, string>>
  hdel(key: string, ...fields: string[]): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  scan(
    cursor: string | number,
    match: string,
    matchValue: string,
    count: string,
    countValue: number,
  ): Promise<[string, string[]]>
  keys(pattern: string): Promise<string[]>
}

/**
 * Configuration for Redis metrics aggregation
 */
export interface RedisAggregatorConfig {
  /** Redis client instance (ioredis compatible) */
  redis: RedisClient
  /** Unique identifier for this process (e.g., 'api', 'worker-1') */
  processId: string
  /** Key prefix for metrics in Redis */
  keyPrefix?: string
  /** TTL for metric keys in seconds (default: 120) */
  ttl?: number
  /** Sync interval in milliseconds (default: 5000) */
  syncInterval?: number
}

const DEFAULT_TTL = 120 // 2 minutes
const DEFAULT_SYNC_INTERVAL = 5000 // 5 seconds
const DEFAULT_KEY_PREFIX = 'metrics:aggregated'

/**
 * Aggregated Counter that syncs to Redis
 */
export class AggregatedCounter {
  private localValues: Map<string, number> = new Map()
  private pendingIncrements: Map<string, number> = new Map()

  constructor(
    private config: RedisAggregatorConfig,
    private name: string,
    private help: string,
    private labelNames: string[],
  ) {}

  /**
   * Increment the counter
   */
  inc(labels: Record<string, string> = {}, value = 1): void {
    const key = this.serializeLabels(labels)
    const current = this.pendingIncrements.get(key) || 0
    this.pendingIncrements.set(key, current + value)

    // Also update local for immediate reads
    const localCurrent = this.localValues.get(key) || 0
    this.localValues.set(key, localCurrent + value)
  }

  /**
   * Sync pending increments to Redis
   */
  async sync(): Promise<void> {
    if (this.pendingIncrements.size === 0) return

    const {
      redis,
      processId,
      keyPrefix = DEFAULT_KEY_PREFIX,
      ttl = DEFAULT_TTL,
    } = this.config
    const metricKey = `${keyPrefix}:counter:${this.name}`

    // Get current values from Redis for this process
    const existingData = await redis.hget(metricKey, processId)
    const existing: Record<string, number> = existingData
      ? JSON.parse(existingData)
      : {}

    // Merge pending increments
    for (const [labelKey, increment] of this.pendingIncrements) {
      existing[labelKey] = (existing[labelKey] || 0) + increment
    }

    // Store back to Redis
    await redis.hset(metricKey, processId, JSON.stringify(existing))
    await redis.expire(metricKey, ttl)

    // Clear pending
    this.pendingIncrements.clear()
  }

  /**
   * Get aggregated values from all processes
   */
  async getAggregated(): Promise<Map<string, number>> {
    const { redis, keyPrefix = DEFAULT_KEY_PREFIX } = this.config
    const metricKey = `${keyPrefix}:counter:${this.name}`

    const allData = await redis.hgetall(metricKey)
    const aggregated = new Map<string, number>()

    for (const processData of Object.values(allData)) {
      const values: Record<string, number> = JSON.parse(processData)
      for (const [labelKey, value] of Object.entries(values)) {
        aggregated.set(labelKey, (aggregated.get(labelKey) || 0) + value)
      }
    }

    return aggregated
  }

  private serializeLabels(labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) return '__default__'
    return this.labelNames
      .map((name) => `${name}="${labels[name] || ''}"`)
      .join(',')
  }

  get metricName(): string {
    return this.name
  }

  get metricHelp(): string {
    return this.help
  }

  get metricLabelNames(): string[] {
    return this.labelNames
  }
}

/**
 * Aggregated Gauge that syncs to Redis
 * Gauges use "last write wins" per process, then aggregate based on strategy
 */
export class AggregatedGauge {
  private localValues: Map<string, number> = new Map()
  private dirty = false

  constructor(
    private config: RedisAggregatorConfig,
    private name: string,
    private help: string,
    private labelNames: string[],
    private aggregationStrategy: 'sum' | 'max' | 'min' | 'avg' = 'sum',
  ) {}

  /**
   * Set gauge value
   */
  set(value: number, labels: Record<string, string> = {}): void {
    const key = this.serializeLabels(labels)
    this.localValues.set(key, value)
    this.dirty = true
  }

  /**
   * Increment gauge
   */
  inc(labels: Record<string, string> = {}, value = 1): void {
    const key = this.serializeLabels(labels)
    const current = this.localValues.get(key) || 0
    this.localValues.set(key, current + value)
    this.dirty = true
  }

  /**
   * Decrement gauge
   */
  dec(labels: Record<string, string> = {}, value = 1): void {
    const key = this.serializeLabels(labels)
    const current = this.localValues.get(key) || 0
    this.localValues.set(key, current - value)
    this.dirty = true
  }

  /**
   * Sync to Redis
   */
  async sync(): Promise<void> {
    if (!this.dirty) return

    const {
      redis,
      processId,
      keyPrefix = DEFAULT_KEY_PREFIX,
      ttl = DEFAULT_TTL,
    } = this.config
    const metricKey = `${keyPrefix}:gauge:${this.name}`

    const values: Record<string, number> = {}
    for (const [labelKey, value] of this.localValues) {
      values[labelKey] = value
    }

    await redis.hset(metricKey, processId, JSON.stringify(values))
    await redis.expire(metricKey, ttl)

    this.dirty = false
  }

  /**
   * Get aggregated values from all processes
   */
  async getAggregated(): Promise<Map<string, number>> {
    const { redis, keyPrefix = DEFAULT_KEY_PREFIX } = this.config
    const metricKey = `${keyPrefix}:gauge:${this.name}`

    const allData = await redis.hgetall(metricKey)
    const valuesByLabel = new Map<string, number[]>()

    for (const processData of Object.values(allData)) {
      const values: Record<string, number> = JSON.parse(processData)
      for (const [labelKey, value] of Object.entries(values)) {
        const existing = valuesByLabel.get(labelKey) || []
        existing.push(value)
        valuesByLabel.set(labelKey, existing)
      }
    }

    const aggregated = new Map<string, number>()
    for (const [labelKey, values] of valuesByLabel) {
      let result: number
      switch (this.aggregationStrategy) {
        case 'sum':
          result = values.reduce((a, b) => a + b, 0)
          break
        case 'max':
          result = Math.max(...values)
          break
        case 'min':
          result = Math.min(...values)
          break
        case 'avg':
          result = values.reduce((a, b) => a + b, 0) / values.length
          break
      }
      aggregated.set(labelKey, result)
    }

    return aggregated
  }

  private serializeLabels(labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) return '__default__'
    return this.labelNames
      .map((name) => `${name}="${labels[name] || ''}"`)
      .join(',')
  }

  get metricName(): string {
    return this.name
  }

  get metricHelp(): string {
    return this.help
  }

  get metricLabelNames(): string[] {
    return this.labelNames
  }

  get strategy(): 'sum' | 'max' | 'min' | 'avg' {
    return this.aggregationStrategy
  }
}

/**
 * Histogram bucket data
 */
interface HistogramData {
  buckets: Record<string, number> // bucket upper bound -> count
  sum: number
  count: number
}

/**
 * Aggregated Histogram that syncs to Redis
 */
export class AggregatedHistogram {
  private localValues: Map<string, HistogramData> = new Map()
  private pendingObservations: Map<string, number[]> = new Map()

  constructor(
    private config: RedisAggregatorConfig,
    private name: string,
    private help: string,
    private labelNames: string[],
    private buckets: number[] = [
      0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
    ],
  ) {
    // Sort buckets
    this.buckets = [...buckets].sort((a, b) => a - b)
  }

  /**
   * Observe a value
   */
  observe(value: number, labels: Record<string, string> = {}): void {
    const key = this.serializeLabels(labels)
    const pending = this.pendingObservations.get(key) || []
    pending.push(value)
    this.pendingObservations.set(key, pending)

    // Update local for immediate reads
    this.updateLocal(key, value)
  }

  private updateLocal(key: string, value: number): void {
    let data = this.localValues.get(key)
    if (!data) {
      data = {
        buckets: {},
        sum: 0,
        count: 0,
      }
      // Initialize buckets
      for (const bucket of this.buckets) {
        data.buckets[bucket.toString()] = 0
      }
      data.buckets['+Inf'] = 0
    }

    // Update buckets
    for (const bucket of this.buckets) {
      if (value <= bucket) {
        data.buckets[bucket.toString()]++
      }
    }
    data.buckets['+Inf']++

    data.sum += value
    data.count++

    this.localValues.set(key, data)
  }

  /**
   * Sync to Redis
   */
  async sync(): Promise<void> {
    if (this.pendingObservations.size === 0) return

    const {
      redis,
      processId,
      keyPrefix = DEFAULT_KEY_PREFIX,
      ttl = DEFAULT_TTL,
    } = this.config
    const metricKey = `${keyPrefix}:histogram:${this.name}`

    // Get existing data for this process
    const existingRaw = await redis.hget(metricKey, processId)
    const existing: Record<string, HistogramData> = existingRaw
      ? JSON.parse(existingRaw)
      : {}

    // Process pending observations
    for (const [labelKey, observations] of this.pendingObservations) {
      if (!existing[labelKey]) {
        existing[labelKey] = {
          buckets: {},
          sum: 0,
          count: 0,
        }
        for (const bucket of this.buckets) {
          existing[labelKey].buckets[bucket.toString()] = 0
        }
        existing[labelKey].buckets['+Inf'] = 0
      }

      for (const value of observations) {
        for (const bucket of this.buckets) {
          if (value <= bucket) {
            existing[labelKey].buckets[bucket.toString()]++
          }
        }
        existing[labelKey].buckets['+Inf']++
        existing[labelKey].sum += value
        existing[labelKey].count++
      }
    }

    await redis.hset(metricKey, processId, JSON.stringify(existing))
    await redis.expire(metricKey, ttl)

    this.pendingObservations.clear()
  }

  /**
   * Get aggregated histogram data from all processes
   */
  async getAggregated(): Promise<Map<string, HistogramData>> {
    const { redis, keyPrefix = DEFAULT_KEY_PREFIX } = this.config
    const metricKey = `${keyPrefix}:histogram:${this.name}`

    const allData = await redis.hgetall(metricKey)
    const aggregated = new Map<string, HistogramData>()

    for (const processData of Object.values(allData)) {
      const values: Record<string, HistogramData> = JSON.parse(processData)
      for (const [labelKey, data] of Object.entries(values)) {
        let existing = aggregated.get(labelKey)
        if (!existing) {
          existing = {
            buckets: {},
            sum: 0,
            count: 0,
          }
          for (const bucket of this.buckets) {
            existing.buckets[bucket.toString()] = 0
          }
          existing.buckets['+Inf'] = 0
        }

        // Aggregate buckets
        for (const [bucket, count] of Object.entries(data.buckets)) {
          existing.buckets[bucket] = (existing.buckets[bucket] || 0) + count
        }
        existing.sum += data.sum
        existing.count += data.count

        aggregated.set(labelKey, existing)
      }
    }

    return aggregated
  }

  private serializeLabels(labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) return '__default__'
    return this.labelNames
      .map((name) => `${name}="${labels[name] || ''}"`)
      .join(',')
  }

  get metricName(): string {
    return this.name
  }

  get metricHelp(): string {
    return this.help
  }

  get metricLabelNames(): string[] {
    return this.labelNames
  }

  get metricBuckets(): number[] {
    return this.buckets
  }
}

/**
 * Aggregated metrics registry that syncs metrics across processes via Redis
 */
export class RedisAggregatedRegistry {
  private counters: Map<string, AggregatedCounter> = new Map()
  private gauges: Map<string, AggregatedGauge> = new Map()
  private histograms: Map<string, AggregatedHistogram> = new Map()
  private syncTimer: ReturnType<typeof setInterval> | null = null
  private localRegistry: Registry | null = null

  constructor(private config: RedisAggregatorConfig) {}

  /**
   * Set the local prom-client registry for Node.js default metrics
   */
  setLocalRegistry(registry: Registry): void {
    this.localRegistry = registry
  }

  /**
   * Create an aggregated counter
   */
  createCounter(
    name: string,
    help: string,
    labelNames: string[] = [],
  ): AggregatedCounter {
    const counter = new AggregatedCounter(this.config, name, help, labelNames)
    this.counters.set(name, counter)
    return counter
  }

  /**
   * Create an aggregated gauge
   */
  createGauge(
    name: string,
    help: string,
    labelNames: string[] = [],
    aggregationStrategy: 'sum' | 'max' | 'min' | 'avg' = 'sum',
  ): AggregatedGauge {
    const gauge = new AggregatedGauge(
      this.config,
      name,
      help,
      labelNames,
      aggregationStrategy,
    )
    this.gauges.set(name, gauge)
    return gauge
  }

  /**
   * Create an aggregated histogram
   */
  createHistogram(
    name: string,
    help: string,
    labelNames: string[] = [],
    buckets?: number[],
  ): AggregatedHistogram {
    const histogram = new AggregatedHistogram(
      this.config,
      name,
      help,
      labelNames,
      buckets,
    )
    this.histograms.set(name, histogram)
    return histogram
  }

  /**
   * Start automatic sync to Redis
   */
  startSync(): void {
    if (this.syncTimer) return

    const interval = this.config.syncInterval || DEFAULT_SYNC_INTERVAL
    this.syncTimer = setInterval(() => {
      this.sync().catch((err) => {
        console.error('Failed to sync metrics to Redis:', err)
      })
    }, interval)

    // Don't prevent process exit
    this.syncTimer.unref()
  }

  /**
   * Stop automatic sync
   */
  stopSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
  }

  /**
   * Sync all metrics to Redis
   */
  async sync(): Promise<void> {
    const promises: Promise<void>[] = []

    for (const counter of this.counters.values()) {
      promises.push(counter.sync())
    }
    for (const gauge of this.gauges.values()) {
      promises.push(gauge.sync())
    }
    for (const histogram of this.histograms.values()) {
      promises.push(histogram.sync())
    }

    await Promise.all(promises)
  }

  /**
   * Get Prometheus-formatted metrics string (aggregated from all processes)
   */
  async metrics(): Promise<string> {
    const lines: string[] = []

    // Add local registry metrics (Node.js default metrics) if available
    if (this.localRegistry) {
      try {
        const localMetrics = await this.localRegistry.metrics()
        if (localMetrics) {
          lines.push(localMetrics)
        }
      } catch (err) {
        // Log error but continue with aggregated metrics
        console.error('Failed to get local registry metrics:', err)
      }
    }

    // Add aggregated counters
    try {
      for (const counter of this.counters.values()) {
        const aggregated = await counter.getAggregated()
        if (aggregated.size > 0) {
          lines.push(`# HELP ${counter.metricName} ${counter.metricHelp}`)
          lines.push(`# TYPE ${counter.metricName} counter`)
          for (const [labelKey, value] of aggregated) {
            if (labelKey === '__default__') {
              lines.push(`${counter.metricName} ${value}`)
            } else {
              lines.push(`${counter.metricName}{${labelKey}} ${value}`)
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to get aggregated counters:', err)
    }

    // Add aggregated gauges
    try {
      for (const gauge of this.gauges.values()) {
        const aggregated = await gauge.getAggregated()
        if (aggregated.size > 0) {
          lines.push(`# HELP ${gauge.metricName} ${gauge.metricHelp}`)
          lines.push(`# TYPE ${gauge.metricName} gauge`)
          for (const [labelKey, value] of aggregated) {
            if (labelKey === '__default__') {
              lines.push(`${gauge.metricName} ${value}`)
            } else {
              lines.push(`${gauge.metricName}{${labelKey}} ${value}`)
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to get aggregated gauges:', err)
    }

    // Add aggregated histograms
    try {
      for (const histogram of this.histograms.values()) {
        const aggregated = await histogram.getAggregated()
        if (aggregated.size > 0) {
          lines.push(`# HELP ${histogram.metricName} ${histogram.metricHelp}`)
          lines.push(`# TYPE ${histogram.metricName} histogram`)
          for (const [labelKey, data] of aggregated) {
            const labelPart = labelKey === '__default__' ? '' : `{${labelKey}}`
            const labelWithComma =
              labelKey === '__default__' ? '' : `${labelKey},`

            // Output buckets (already cumulative in storage)
            for (const bucket of histogram.metricBuckets) {
              const bucketValue = data.buckets[bucket.toString()] || 0
              if (labelKey === '__default__') {
                lines.push(
                  `${histogram.metricName}_bucket{le="${bucket}"} ${bucketValue}`,
                )
              } else {
                lines.push(
                  `${histogram.metricName}_bucket{${labelWithComma}le="${bucket}"} ${bucketValue}`,
                )
              }
            }
            // +Inf bucket (equals count)
            if (labelKey === '__default__') {
              lines.push(
                `${histogram.metricName}_bucket{le="+Inf"} ${data.count}`,
              )
            } else {
              lines.push(
                `${histogram.metricName}_bucket{${labelWithComma}le="+Inf"} ${data.count}`,
              )
            }

            // Sum and count
            lines.push(`${histogram.metricName}_sum${labelPart} ${data.sum}`)
            lines.push(
              `${histogram.metricName}_count${labelPart} ${data.count}`,
            )
          }
        }
      }
    } catch (err) {
      console.error('Failed to get aggregated histograms:', err)
    }

    return lines.join('\n')
  }

  /**
   * Content type for Prometheus
   */
  get contentType(): string {
    return 'text/plain; version=0.0.4; charset=utf-8'
  }

  /**
   * Clean up stale process entries from Redis
   */
  async cleanupStaleEntries(): Promise<void> {
    const { redis, keyPrefix = DEFAULT_KEY_PREFIX } = this.config

    // Get all metric keys
    const keys = await redis.keys(`${keyPrefix}:*`)

    for (const key of keys) {
      const data = await redis.hgetall(key)
      const staleProcesses: string[] = []

      for (const [processId, value] of Object.entries(data)) {
        try {
          const parsed = JSON.parse(value)
          // Check if data is stale (no updatedAt or very old)
          // This is a simple heuristic - in production you might want timestamps
          if (!parsed || Object.keys(parsed).length === 0) {
            staleProcesses.push(processId)
          }
        } catch {
          staleProcesses.push(processId)
        }
      }

      if (staleProcesses.length > 0) {
        await redis.hdel(key, ...staleProcesses)
      }
    }
  }
}

/**
 * Create a Redis-aggregated metrics registry
 */
export const createRedisAggregatedRegistry = (
  config: RedisAggregatorConfig,
): RedisAggregatedRegistry => {
  return new RedisAggregatedRegistry(config)
}
