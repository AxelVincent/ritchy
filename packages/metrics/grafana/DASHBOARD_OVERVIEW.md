# Ritchy Production Dashboard Overview

## 🎯 Dashboard Access

**URL:** http://localhost:3200/d/ritchy-production

**Credentials:**
- Username: `admin`
- Password: `admin`

**Auto-refresh:** 10 seconds
**Default time range:** Last 1 hour

---

## 📊 Dashboard Sections

### 1. System Health (6 KPI Cards)

**Quick health check at a glance:**

| Metric | Description | Thresholds |
|--------|-------------|------------|
| **CPU Usage** | Node.js process CPU utilization | Yellow: 70%, Red: 90% |
| **Memory Usage** | Heap memory usage percentage | Yellow: 70%, Red: 90% |
| **Error Rate** | HTTP 5xx errors percentage | Yellow: 1%, Red: 5% |
| **P95 Latency** | 95th percentile response time | Yellow: 0.5s, Red: 1s |
| **Request Rate** | Requests per second | Info only |
| **Active Enrichments** | Currently processing enrichments | Info only |

**Purpose:** Immediate visibility into system health. Red = action required!

---

### 2. HTTP Traffic (4 Panels)

#### **Request Rate by Endpoint**
- Line graph showing RPS per route
- **Use case:** Identify hot endpoints, traffic patterns
- **Labels:** Method, Route
- **Metric:** `ritchy_http_requests_total`

#### **Requests by Status Code**
- Stacked area chart of status codes
- **Use case:** Monitor error rates visually
- **Labels:** Status code (2xx, 4xx, 5xx)
- **Metric:** `ritchy_http_requests_total`

#### **Request Duration (P50, P95, P99)**
- Multi-line graph showing latency percentiles
- **Use case:** Performance monitoring, SLA tracking
- **Thresholds:** Yellow at 0.5s, Red at 1s
- **Metric:** `ritchy_http_request_duration_seconds_bucket`

#### **Request/Response Size**
- Dual-line graph of payload sizes
- **Use case:** Bandwidth optimization, detecting large payloads
- **Metric:** `ritchy_http_request_size_bytes`, `ritchy_http_response_size_bytes`

---

### 3. Enrichment Processing (5 Panels)

#### **Active Enrichments by Status**
- Line graph of active jobs by status
- **Use case:** Monitor queue depth
- **Labels:** Status (queued, processing, completed, failed)
- **Metric:** `ritchy_enrichment_active`

#### **Enrichment Request Rate**
- Line graph of enrichment requests
- **Use case:** Monitor enrichment throughput
- **Labels:** Enrichment type, Status
- **Metric:** `ritchy_enrichment_requests_total`

#### **Enrichment Errors**
- Line graph of error rates
- **Use case:** Identify problematic enrichment types
- **Labels:** Enrichment type, Error type
- **Metric:** `ritchy_enrichment_errors_total`

#### **Enrichment Duration (P95, P99)**
- Performance percentiles by type
- **Use case:** SLA monitoring, identify slow enrichments
- **Thresholds:** Yellow at 30s, Red at 60s
- **Metric:** `ritchy_enrichment_duration_seconds_bucket`

#### **Enrichment Duration by Step**
- Average duration per processing step
- **Use case:** Optimize individual steps
- **Labels:** Step (scrape, extract, verify, etc.)
- **Metric:** `ritchy_enrichment_duration_seconds`

---

### 4. Queue Processing (5 Panels)

#### **Active Queue Jobs**
- Current number of jobs being processed
- **Use case:** Monitor queue backlog
- **Labels:** Queue name
- **Metric:** `ritchy_queue_active_jobs`

#### **Job Processing Rate**
- Jobs completed per second
- **Use case:** Monitor throughput
- **Labels:** Queue name, Status
- **Metric:** `ritchy_queue_jobs_processed_total`

#### **Job Failures**
- Failed jobs rate
- **Use case:** Identify failing job types
- **Labels:** Queue name, Job type
- **Metric:** `ritchy_queue_jobs_failed_total`

#### **Job Duration (P95, P99)**
- Processing time percentiles
- **Use case:** Performance monitoring
- **Metric:** `ritchy_queue_job_duration_seconds_bucket`

#### **Job Success Rate**
- Percentage of successful jobs
- **Use case:** Quality monitoring
- **Thresholds:** Yellow at 90%, Red at 95%
- **Metric:** `ritchy_queue_jobs_processed_total`

---

### 5. Database Performance (2 Panels)

#### **Query Rate**
- Queries per second by operation and table
- **Use case:** Monitor database load
- **Labels:** Operation (select, insert, update, delete), Table
- **Metric:** `ritchy_database_queries_total`

#### **Query Duration (P95, P99)**
- Database query latency
- **Use case:** Identify slow queries
- **Thresholds:** Yellow at 0.1s, Red at 0.5s
- **Metric:** `ritchy_database_query_duration_seconds_bucket`

---

### 6. Node.js Runtime (2 Panels)

#### **Memory Usage**
- Resident memory, heap total, and heap used
- **Use case:** Memory leak detection
- **Metric:** `ritchy_nodejs_process_resident_memory_bytes`, `ritchy_nodejs_heap_size_*_bytes`

#### **Event Loop & GC**
- Event loop lag and garbage collection duration
- **Use case:** Runtime health, performance tuning
- **Metric:** `ritchy_nodejs_eventloop_lag_seconds`, `ritchy_nodejs_gc_duration_seconds`

---

### 7. WebSocket & External APIs (4 Panels)

#### **WebSocket Connections**
- Active connections by namespace
- **Use case:** Monitor real-time connections
- **Labels:** Namespace
- **Metric:** `ritchy_websocket_connections`

#### **WebSocket Message Rate**
- Messages per second (inbound/outbound)
- **Use case:** Monitor real-time traffic
- **Labels:** Namespace, Direction
- **Metric:** `ritchy_websocket_messages_total`

#### **External API Request Rate**
- Requests to external services
- **Use case:** Monitor third-party dependencies
- **Labels:** Service, Status code
- **Metric:** `ritchy_external_api_requests_total`

#### **External API Duration**
- P95 latency to external services
- **Use case:** Identify slow external dependencies
- **Labels:** Service
- **Metric:** `ritchy_external_api_duration_seconds_bucket`

---

## 🚨 Alert Recommendations

### Critical Alerts

```yaml
# High Error Rate
- alert: HighErrorRate
  expr: sum(rate(ritchy_http_requests_total{status_code=~"5.."}[5m])) / sum(rate(ritchy_http_requests_total[5m])) > 0.05
  for: 5m
  severity: critical

# High Memory Usage
- alert: HighMemoryUsage
  expr: (ritchy_nodejs_heap_size_used_bytes / ritchy_nodejs_heap_size_total_bytes) > 0.9
  for: 5m
  severity: critical

# Slow Requests
- alert: SlowRequests
  expr: histogram_quantile(0.95, rate(ritchy_http_request_duration_seconds_bucket[5m])) > 2
  for: 10m
  severity: warning

# High Enrichment Failure Rate
- alert: HighEnrichmentFailureRate
  expr: sum(rate(ritchy_enrichment_requests_total{status="failed"}[5m])) / sum(rate(ritchy_enrichment_requests_total[5m])) > 0.1
  for: 5m
  severity: warning

# Queue Job Backlog
- alert: QueueBacklog
  expr: sum(ritchy_queue_active_jobs) > 100
  for: 10m
  severity: warning

# Database Slow Queries
- alert: SlowDatabaseQueries
  expr: histogram_quantile(0.95, rate(ritchy_database_query_duration_seconds_bucket[5m])) > 0.5
  for: 5m
  severity: warning
```

---

## 📈 Performance Baselines

### Expected Values (Healthy System)

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| CPU Usage | < 50% | > 70% | > 90% |
| Memory Usage | < 60% | > 70% | > 90% |
| Error Rate | < 0.1% | > 1% | > 5% |
| P95 Latency | < 200ms | > 500ms | > 1s |
| P99 Latency | < 500ms | > 1s | > 2s |
| Enrichment Success | > 95% | < 90% | < 80% |
| Queue Success Rate | > 98% | < 95% | < 90% |
| DB Query P95 | < 50ms | > 100ms | > 500ms |

---

## 🔍 Troubleshooting Guide

### High CPU Usage

1. **Check:** Request rate spike
2. **Check:** Event loop lag
3. **Check:** Enrichment processing load
4. **Action:** Scale horizontally or optimize code

### High Memory Usage

1. **Check:** Heap growth trend
2. **Check:** GC frequency and duration
3. **Check:** Active enrichments count
4. **Action:** Restart service, investigate memory leaks

### High Error Rate

1. **Check:** Which endpoints are failing (status code panel)
2. **Check:** External API errors
3. **Check:** Database connection issues
4. **Action:** Check logs, review recent deploys

### Slow Requests

1. **Check:** Database query duration
2. **Check:** External API latency
3. **Check:** Enrichment processing time
4. **Action:** Optimize queries, add caching, review code

### Queue Backlog

1. **Check:** Job failure rate
2. **Check:** Job processing duration
3. **Check:** Worker concurrency settings
4. **Action:** Scale workers, fix failing jobs

---

## 🎨 Customization

### Add Custom Panels

1. Click **"Add panel"** in top right
2. Select **Prometheus** datasource
3. Write PromQL query
4. Configure visualization
5. Click **"Apply"**

### Export Dashboard

1. Dashboard settings (⚙️) → **"JSON Model"**
2. Copy JSON
3. Save to `grafana/provisioning/dashboards/json/`

### Create Dashboard Variables

1. Dashboard settings → **"Variables"**
2. Add variable (e.g., `environment`, `queue_name`)
3. Use in queries: `{queue_name=~"$queue_name"}`

---

## 📊 Sample Queries

### Top 10 Slowest Endpoints

```promql
topk(10,
  histogram_quantile(0.95,
    sum(rate(ritchy_http_request_duration_seconds_bucket[5m])) by (le, route)
  )
)
```

### Error Rate by Endpoint

```promql
sum(rate(ritchy_http_requests_total{status_code=~"5.."}[5m])) by (route) /
sum(rate(ritchy_http_requests_total[5m])) by (route)
```

### Average Enrichment Duration

```promql
avg(rate(ritchy_enrichment_duration_seconds_sum[5m]) /
    rate(ritchy_enrichment_duration_seconds_count[5m])) by (enrichment_type)
```

### Database Operations Breakdown

```promql
sum(rate(ritchy_database_queries_total[5m])) by (operation)
```

---

## 🔗 Related Dashboards

- **Ritchy Overview** (`ritchy-overview`) - Simplified view with key metrics
- **Node.js Details** - Deep dive into Node.js runtime (create custom)
- **Database Deep Dive** - Detailed database metrics (create custom)
- **Enrichment Pipeline** - Enrichment-specific dashboard (create custom)

---

## 📝 Dashboard Maintenance

### Update Dashboard

1. Make changes in Grafana UI
2. Export JSON (Settings → JSON Model)
3. Save to `grafana/provisioning/dashboards/json/ritchy-production.json`
4. Commit to git

### Version Control

```bash
# Dashboard is version controlled
git add grafana/provisioning/dashboards/json/ritchy-production.json
git commit -m "[monitoring] Update production dashboard"
```

---

## 🎯 Key Metrics Summary

### Golden Signals (SRE)

**Latency:**
- P95/P99 request duration
- Enrichment duration
- Database query duration

**Traffic:**
- Request rate
- Enrichment rate
- Queue job rate

**Errors:**
- HTTP 5xx rate
- Enrichment failures
- Queue job failures

**Saturation:**
- CPU usage
- Memory usage
- Queue backlog
- Active enrichments

---

**Dashboard Version:** 1.0.0
**Last Updated:** November 20, 2025
**Maintained by:** Ritchy Team
