# Grafana Dashboards Guide

A comprehensive guide for creating and managing Grafana dashboards for Ritchy metrics.

## 🚀 Quick Start

### Access Grafana

- **URL:** http://localhost:3200
- **Username:** `admin`
- **Password:** `admin`

### Pre-configured Datasources

✅ **Prometheus** - `http://prometheus:9090` (default)
✅ **Loki** - `http://loki:3100`

---

## 📊 Pre-built Dashboards

### Ritchy Overview Dashboard

Location: `grafana/provisioning/dashboards/json/ritchy-overview.json`

**Includes:**
- HTTP Request Rate by method and route
- Request Duration (P95 & P99)
- Error Rate (5xx responses)
- Active Enrichments count
- Memory Usage
- CPU Usage
- Enrichment Request Rate by type and status
- Enrichment Duration (P95)

**Access:** Dashboards → Ritchy → Overview

---

## 🔄 How to Duplicate Graphs to Custom Dashboards

### Method 1: From Explore to Dashboard (Easiest)

1. **Go to Explore**
   - Click the compass icon (🧭) in the left sidebar
   - Or navigate to: http://localhost:3200/explore

2. **Build Your Query**
   ```promql
   # Example: Request rate by endpoint
   sum(rate(ritchy_http_requests_total[5m])) by (route)
   ```

3. **Configure Visualization**
   - Choose visualization type: Time series, Stat, Gauge, Table, etc.
   - Set display options (legend, colors, units)
   - Adjust time range

4. **Add to Dashboard**
   - Click the **"Add"** button (top right)
   - Select **"Add to dashboard"**
   - Choose:
     - **"Open dashboard"** → Select existing dashboard
     - **"New dashboard"** → Create new dashboard
   - Panel is added with all settings preserved

### Method 2: Copy from Existing Panel

1. **Open Source Dashboard**
   - Navigate to the dashboard with the panel you want

2. **Edit the Panel**
   - Hover over panel → Click title → Select **"Edit"**

3. **Copy Configuration**
   - **Query tab:** Copy the PromQL query
   - **Panel options:** Note visualization type and settings
   - **Field config:** Note units, thresholds, overrides

4. **Create in New Dashboard**
   - Go to target dashboard
   - Click **"Add panel"** → **"Add a new panel"**
   - Paste query and configure settings
   - Click **"Apply"**

### Method 3: Using Panel JSON (Exact Copy)

1. **Export Panel JSON**
   - Edit the panel
   - Click **"Panel JSON"** icon (top right, looks like `{ }`)
   - Copy entire JSON

2. **Import to New Dashboard**
   - Go to target dashboard
   - Click **"Add panel"** → **"Add a new panel"**
   - Click **"Panel JSON"** icon
   - Paste JSON → Click **"Apply"**

### Method 4: Duplicate Entire Dashboard

1. **Dashboard Settings**
   - Open dashboard → Click ⚙️ (Settings) in top right

2. **Save As**
   - Click **"Save As"**
   - Enter new name
   - Click **"Save"**

---

## 🎨 Creating Custom Dashboards

### Create New Dashboard

1. **Navigate to Dashboards**
   - Click **"+"** in left sidebar → **"Create Dashboard"**
   - Or go to: http://localhost:3200/dashboard/new

2. **Add Panels**
   - Click **"Add visualization"**
   - Select **Prometheus** datasource
   - Build your query

3. **Configure Panel**
   - **Query:** Write PromQL
   - **Visualization:** Choose type
   - **Panel options:** Set title, description
   - **Field config:** Set units, thresholds

4. **Save Dashboard**
   - Click save icon (💾) top right
   - Enter dashboard name and folder
   - Add tags for organization

### Dashboard Organization

**Folders:**
- Create folders: **"+"** → **"Create Folder"**
- Organize by: Team, Service, Environment

**Tags:**
- Add tags for easy searching
- Examples: `ritchy`, `api`, `enrichment`, `performance`

---

## 📈 Common Panel Types & Use Cases

### Time Series Graph

**Best for:** Trends over time, rates, durations

```promql
# Request rate
rate(ritchy_http_requests_total[5m])

# Duration percentiles
histogram_quantile(0.95, rate(ritchy_http_request_duration_seconds_bucket[5m]))
```

**Settings:**
- **Legend:** Show as table with stats (mean, max, current)
- **Connect null values:** Off
- **Fill opacity:** 10-20%

### Stat Panel

**Best for:** Single current value, totals, percentages

```promql
# Current active enrichments
sum(ritchy_enrichment_active)

# Error rate
sum(rate(ritchy_http_requests_total{status_code=~"5.."}[5m])) /
sum(rate(ritchy_http_requests_total[5m]))
```

**Settings:**
- **Calculation:** Last (not null)
- **Color mode:** Value or background
- **Graph mode:** Area or none
- **Thresholds:** Set warning/error levels

### Gauge Panel

**Best for:** Showing current value within range (CPU, memory, %)

```promql
# CPU usage
rate(ritchy_nodejs_process_cpu_seconds_total[5m]) * 100

# Memory usage percentage
(ritchy_nodejs_heap_size_used_bytes / ritchy_nodejs_heap_size_total_bytes) * 100
```

**Settings:**
- **Min:** 0
- **Max:** 100 (for percentages)
- **Thresholds:** Yellow at 70%, Red at 90%

### Table Panel

**Best for:** Multiple metrics in rows, comparisons

```promql
# Top endpoints by request count
topk(10, sum(rate(ritchy_http_requests_total[5m])) by (route))
```

**Settings:**
- **Format as:** Table
- **Apply cell color:** Based on thresholds

---

## 🎯 Useful PromQL Queries for Ritchy

### HTTP Metrics

```promql
# Request rate by route
sum(rate(ritchy_http_requests_total[5m])) by (route)

# Request rate by status code
sum(rate(ritchy_http_requests_total[5m])) by (status_code)

# P95 request duration
histogram_quantile(0.95, sum(rate(ritchy_http_request_duration_seconds_bucket[5m])) by (le, route))

# P99 request duration
histogram_quantile(0.99, sum(rate(ritchy_http_request_duration_seconds_bucket[5m])) by (le, route))

# Error rate (percentage)
sum(rate(ritchy_http_requests_total{status_code=~"5.."}[5m])) /
sum(rate(ritchy_http_requests_total[5m])) * 100

# Success rate (percentage)
sum(rate(ritchy_http_requests_total{status_code=~"2.."}[5m])) /
sum(rate(ritchy_http_requests_total[5m])) * 100

# Average response size
avg(rate(ritchy_http_response_size_bytes_sum[5m]) / rate(ritchy_http_response_size_bytes_count[5m]))
```

### Enrichment Metrics

```promql
# Active enrichments by status
sum(ritchy_enrichment_active) by (status)

# Enrichment request rate
sum(rate(ritchy_enrichment_requests_total[5m])) by (enrichment_type, status)

# Enrichment success rate
sum(rate(ritchy_enrichment_requests_total{status="success"}[5m])) /
sum(rate(ritchy_enrichment_requests_total[5m]))

# P95 enrichment duration by type
histogram_quantile(0.95, sum(rate(ritchy_enrichment_duration_seconds_bucket[5m])) by (le, enrichment_type))

# Enrichment error rate
sum(rate(ritchy_enrichment_errors_total[5m])) by (enrichment_type, error_type)

# Average enrichment duration by step
avg(rate(ritchy_enrichment_duration_seconds_sum[5m]) / rate(ritchy_enrichment_duration_seconds_count[5m])) by (step)
```

### Node.js / System Metrics

```promql
# Memory usage
ritchy_nodejs_process_resident_memory_bytes

# Heap usage
ritchy_nodejs_heap_size_used_bytes

# Heap usage percentage
(ritchy_nodejs_heap_size_used_bytes / ritchy_nodejs_heap_size_total_bytes) * 100

# CPU usage percentage
rate(ritchy_nodejs_process_cpu_seconds_total[5m]) * 100

# Event loop lag
ritchy_nodejs_eventloop_lag_seconds

# Garbage collection duration
rate(ritchy_nodejs_gc_duration_seconds_sum[5m])
```

### Queue Metrics

```promql
# Active jobs by queue
sum(ritchy_queue_active_jobs) by (queue_name)

# Job processing rate
sum(rate(ritchy_queue_jobs_processed_total[5m])) by (queue_name, status)

# Job failure rate
sum(rate(ritchy_queue_jobs_failed_total[5m])) by (queue_name, job_type)

# P95 job duration
histogram_quantile(0.95, sum(rate(ritchy_queue_job_duration_seconds_bucket[5m])) by (le, queue_name))

# Job success rate
sum(rate(ritchy_queue_jobs_processed_total{status="success"}[5m])) /
sum(rate(ritchy_queue_jobs_processed_total[5m]))
```

### Database Metrics

```promql
# Query rate by operation
sum(rate(ritchy_database_queries_total[5m])) by (operation, table)

# P95 query duration
histogram_quantile(0.95, sum(rate(ritchy_database_query_duration_seconds_bucket[5m])) by (le, operation))

# Slow queries (>1s)
sum(rate(ritchy_database_query_duration_seconds_bucket{le="1"}[5m])) by (operation, table)
```

---

## 🔔 Setting Up Alerts

### Create Alert Rule

1. **Edit Panel**
   - Click panel title → **"Edit"**

2. **Add Alert**
   - Click **"Alert"** tab
   - Click **"Create alert rule from this panel"**

3. **Configure Alert**
   - **Query:** Already populated from panel
   - **Condition:** Set threshold (e.g., `avg() > 0.05` for 5% error rate)
   - **Evaluate every:** 1m
   - **For:** 5m (alert after condition true for 5 minutes)

4. **Add Notification**
   - Configure contact points (Email, Slack, PagerDuty, etc.)
   - Set up notification policies

### Example Alerts

**High Error Rate:**
```promql
sum(rate(ritchy_http_requests_total{status_code=~"5.."}[5m])) /
sum(rate(ritchy_http_requests_total[5m])) > 0.05
```

**High Memory Usage:**
```promql
(ritchy_nodejs_heap_size_used_bytes / ritchy_nodejs_heap_size_total_bytes) > 0.9
```

**Slow Requests:**
```promql
histogram_quantile(0.95, sum(rate(ritchy_http_request_duration_seconds_bucket[5m])) by (le)) > 2
```

---

## 💾 Dashboard as Code (Provisioning)

### Save Dashboard JSON

1. **Export Dashboard**
   - Dashboard settings (⚙️) → **"JSON Model"**
   - Copy JSON

2. **Save to File**
   ```bash
   # Save to provisioning directory
   grafana/provisioning/dashboards/json/my-dashboard.json
   ```

3. **Update Provisioning Config**
   - File: `grafana/provisioning/dashboards/dashboards.yml`
   - Already configured to load from `json/` directory

4. **Restart Grafana**
   ```bash
   docker-compose restart grafana
   ```

### Dashboard JSON Template

```json
{
  "title": "My Dashboard",
  "uid": "my-dashboard-uid",
  "tags": ["ritchy", "custom"],
  "timezone": "browser",
  "schemaVersion": 39,
  "refresh": "5s",
  "time": {
    "from": "now-1h",
    "to": "now"
  },
  "panels": [
    {
      "id": 1,
      "type": "timeseries",
      "title": "My Panel",
      "targets": [
        {
          "expr": "your_promql_query",
          "legendFormat": "{{label}}",
          "refId": "A"
        }
      ],
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 0,
        "y": 0
      }
    }
  ]
}
```

---

## 🎨 Dashboard Best Practices

### Layout

- **Top row:** Key metrics (stats/gauges) - What's happening NOW
- **Middle rows:** Detailed graphs - Trends and patterns
- **Bottom rows:** Debugging/detailed metrics

### Panel Organization

- **Group related metrics** together
- **Use row panels** to organize sections
- **Consistent time ranges** across related panels
- **Meaningful titles** that explain WHAT and WHY

### Performance

- **Limit time range** - Don't query years of data
- **Use rate() and increase()** - Better for counters
- **Avoid high cardinality** - Don't group by user_id
- **Use recording rules** - For complex/slow queries

### Colors & Thresholds

- **Green:** Good (< 50% utilization, low error rate)
- **Yellow:** Warning (50-80% utilization, moderate errors)
- **Red:** Critical (> 80% utilization, high errors)

---

## 🔧 Troubleshooting

### Dashboard Not Loading

```bash
# Check Grafana logs
docker-compose logs grafana

# Restart Grafana
docker-compose restart grafana
```

### No Data in Panels

1. **Check datasource** - Prometheus is running and accessible
2. **Verify metrics exist** - Visit http://localhost:3030/metrics
3. **Check time range** - Adjust panel time range
4. **Test query in Explore** - Validate PromQL syntax

### Panel Shows "No data"

- **Metric doesn't exist** - Check spelling
- **Wrong time range** - Metrics might not exist in that range
- **Rate interval too short** - Use `[5m]` or longer for rate()

---

## 📚 Additional Resources

### Grafana Documentation
- [Dashboard Guide](https://grafana.com/docs/grafana/latest/dashboards/)
- [Panel Editor](https://grafana.com/docs/grafana/latest/panels/)
- [Prometheus Datasource](https://grafana.com/docs/grafana/latest/datasources/prometheus/)

### PromQL Resources
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [PromQL Functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Best Practices](https://prometheus.io/docs/practices/naming/)

---

## 🎯 Quick Actions

### View Metrics Endpoint
```bash
curl http://localhost:3030/metrics
```

### Access Dashboards
- **Grafana:** http://localhost:3200
- **Prometheus:** http://localhost:9090

### Restart Services
```bash
# Restart Grafana only
docker-compose restart grafana

# Restart all observability services
docker-compose restart prometheus grafana loki
```

---

**Created:** November 20, 2025
**Maintained by:** Ritchy Team
