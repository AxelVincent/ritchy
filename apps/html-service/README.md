# HTML Processing Service (Rust)

High-performance HTML processing microservice for Ritchy. Handles memory-intensive HTML operations that previously caused OOM issues in Node.js workers.

## Features

- **HTML Sanitization**: Removes scripts, styles, event handlers using lol_html streaming parser
- **Markdown Conversion**: Converts HTML to clean markdown optimized for RAG indexing
- **Contact Extraction**: Extracts emails and phone numbers using regex
- **Link Extraction**: Categorizes internal links and social media profiles (Instagram, Facebook, LinkedIn)
- **Technology Detection**: Extracts script URLs, meta tags, and iframes for technology stack analysis

## API

### `POST /process`

Process HTML and extract structured data.

**Authentication:** Requires `Authorization: Bearer <API_KEY>` header.

**Request:**
```json
{
  "html": "<html>...</html>",
  "rawHtml": "<html>...</html>",
  "url": "https://example.com",
  "options": {
    "extractContacts": true,
    "extractLinks": true,
    "extractScripts": true,
    "convertToMarkdown": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "markdown": "# Page Title\n\nContent...",
    "contacts": {
      "emails": ["contact@example.com"],
      "phones": ["+33612345678"]
    },
    "links": {
      "internal": ["/about", "/contact"],
      "social": {
        "instagram": [{"url": "...", "username": "..."}],
        "facebook": [{"url": "...", "username": "..."}],
        "linkedin": [{"url": "...", "name": "...", "type": "company"}]
      }
    },
    "scripts": [
      {"type": "script_url", "value": "https://cdn.example.com/app.js"},
      {"type": "meta_tag", "value": "generator:WordPress 6.0"}
    ]
  },
  "metadata": {
    "processingTimeMs": 42,
    "htmlSizeBytes": 125000,
    "markdownSizeBytes": 8500
  }
}
```

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "uptime_seconds": 3600
}
```

## Development

### Prerequisites

- Rust 1.75+
- Docker (for containerized development)

### Local Development

```bash
# Build and run
cargo run

# Run tests
cargo test

# Build release
cargo build --release
```

### Docker

```bash
# Build image
docker build -t ritchy-html-service .

# Run container
docker run -p 3001:3001 ritchy-html-service
```

### With Docker Compose (from monorepo root)

```bash
docker-compose up rust-html-service
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP server port |
| `RUST_LOG` | `info` | Log level (trace, debug, info, warn, error) |
| `MAX_HTML_SIZE_MB` | `10` | Maximum HTML size in megabytes |
| `HTML_SERVICE_API_KEY` | *required* | API key for authentication |
| `NODE_ENV` | `development` | Environment name |
| `LOKI_HOST` | *none* | Loki host URL for log ingestion |

Copy `.env.example` to `.env` and configure the required variables:

```bash
cp .env.example .env
# Edit .env with your API key
```

## Architecture

```
src/
├── main.rs                 # Entry point, server setup
├── config.rs               # Environment configuration
├── error.rs                # Error types and responses
├── middleware/
│   └── auth.rs             # API key authentication middleware
├── routes/
│   ├── health.rs           # Health check endpoint (public)
│   └── process.rs          # Main processing endpoint (protected)
├── processing/
│   ├── sanitizer.rs        # HTML sanitization (lol_html)
│   ├── markdown.rs         # HTML to Markdown conversion
│   ├── text.rs             # Text extraction
│   ├── contacts.rs         # Email/phone extraction
│   ├── links.rs            # Link extraction and classification
│   └── scripts.rs          # Technology signal extraction
└── models/
    ├── request.rs          # Request DTOs
    └── response.rs         # Response DTOs
```

## Memory Characteristics

| Metric | Value |
|--------|-------|
| Idle memory | ~10MB |
| Per-page processing | ~5-20MB |
| Max concurrent pages | 1000+ (with 2-5GB RAM) |

Uses lol_html streaming parser which processes HTML without building a full DOM tree, resulting in significantly lower memory usage compared to Node.js alternatives (Cheerio, JSDOM).

## Integration with Node.js

The Node.js API uses this service via HTTP when the `USE_RUST_HTML_PROCESSOR` feature flag is enabled:

```typescript
import { processHtmlWithRust } from '@/external/rust-html-service'

const result = await processHtmlWithRust({
  html: scrapedHtml,
  rawHtml: rawHtml,
  url: pageUrl,
})
```

See `apps/api/src/external/rust-html-service/` for the client implementation.
