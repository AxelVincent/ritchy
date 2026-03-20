# Ritchy API

Node.js + Express backend for the Ritchy lead generation and enrichment platform. Provides REST APIs, WebSocket real-time updates, job queue processing, and webhook handling.

## Technology Stack

| Category | Technologies |
|----------|-------------|
| **Runtime** | Node.js 23, TypeScript 5.7 (strict) |
| **Framework** | Express 4.21 |
| **Database** | PostgreSQL 15 via Drizzle ORM 0.36 |
| **Cache & Queue** | Redis 7.2, BullMQ 5.56 |
| **Real-time** | Socket.IO 4.8 |
| **Auth** | Clerk (JWT + webhooks via Svix) |
| **Payments** | Stripe (subscriptions + webhooks) |
| **Validation** | Zod |
| **AI/LLM** | LangChain (OpenAI, Anthropic, Mistral, Google AI) |
| **Vector DB** | Qdrant |
| **Logging** | @ritchy/logger (Pino + Loki) |
| **Metrics** | @ritchy/metrics (Prometheus + Grafana) |

## Project Structure

```
src/
|-- index.ts                    # Entry point, middleware stack, server setup
|
|-- config/                     # External service configurations (Zod-validated)
|   |-- clerk.ts                # Clerk auth keys
|   |-- drizzle.ts              # Database connection config
|   |-- redis.ts                # Redis connection config
|   |-- stripe.ts               # Stripe keys + plan pricing
|   |-- llms.ts                 # LLM API keys (OpenAI, Anthropic, Mistral, Google AI)
|   |-- langchain.ts            # LangSmith tracing config
|   |-- basic_auth.ts           # QueueDash credentials
|   |-- qdrant.ts               # Vector DB config
|   |-- icypeas.ts              # IcyPeas config
|   |-- pappers.ts              # Pappers config
|   |-- forager.ts              # Forager config
|   |-- brightdata.ts           # Brightdata config
|   |-- million_verifier.ts     # Million Verifier config
|   |-- contactout.ts           # ContactOut config
|   |-- firecrawl.ts            # Firecrawl config
|   |-- whois.ts                # WHOIS config
|
|-- db/                         # Database layer
|   |-- db.ts                   # Drizzle instance
|   |-- schema/                 # Table definitions (25+ tables)
|   |-- migrate.ts              # Migration runner
|   |-- monitoring.ts           # DB query metrics
|
|-- services/                   # Domain-driven business logic
|   |-- enrichment/             # Core enrichment engine
|   |   |-- company/            # Company enrichment
|   |   |   |-- governmental/   # Business registry lookup (waterfall)
|   |   |   |-- scraper/        # Website scraping + technology detection
|   |   |-- contact/            # Contact enrichment
|   |   |   |-- waterfalls/     # Email, phone, LinkedIn providers
|   |   |-- shared/             # Status manager, config, shared types
|   |-- payment/                # Subscription & credit management
|   |-- api_keys/               # API key CRUD (AES-256 encryption)
|   |-- contact/                # Contact CRUD
|   |-- places/                 # Place data & semantic search
|   |-- searches/               # Search history
|   |-- user/                   # User management
|
|-- external/                   # Third-party service clients
|   |-- google_maps/            # Google Places/Geocoding API
|   |-- pappers/                # French company registry
|   |-- forager/                # People & company data
|   |-- icypeas/                # Email finding
|   |-- brightdata/             # Web scraping
|   |-- million_verifier/       # Email verification
|   |-- contactout/             # People search
|   |-- firecrawl/              # Website scraping
|   |-- whois/                  # Domain WHOIS
|   |-- qdrant/                 # Vector DB client
|   |-- langchain/              # LLM tools & prompts
|   |-- slack/                  # Notifications
|
|-- internal/                   # Infrastructure
|   |-- bullmq/                 # Job queues & workers
|   |-- redis/                  # Redis client, pub/sub, semaphore
|   |-- rate_limiter/           # Request rate limiting
|
|-- middleware/                  # Express middleware
|   |-- api_key_auth.ts         # API key Bearer token validation
|   |-- basic_auth.ts           # Basic HTTP auth
|
|-- routes_web/                 # Clerk-authenticated endpoints (/web/*)
|-- routes_api/                 # API key-authenticated endpoints (/api/v1/*)
|-- webhook/                    # Stripe & Clerk webhook handlers
|-- websocket/                  # Socket.IO namespaces (/enrichment)
|-- metrics/                    # Prometheus metric definitions
|-- types/                      # TypeScript type definitions
|-- utils/                      # Utility functions
|-- shared/                     # Shared helpers
```

## API Routes

### Web Routes (`/web/*`) - Clerk JWT Authentication

| Method | Path | Description |
|--------|------|-------------|
| GET | `/web/users/me` | Current user profile + subscription |
| GET/POST | `/web/user-places/` | Lead/place management (paginated, filterable) |
| GET/POST/PUT/DELETE | `/web/contacts/` | Contact CRUD |
| GET/POST/PUT/DELETE | `/web/lists/` | List management |
| GET | `/web/searches/` | Search history |
| GET | `/web/places/:id` | Place details with reviews |
| POST | `/web/enrich/company` | Trigger company enrichment |
| POST | `/web/enrich/contact` | Trigger contact enrichment |
| POST | `/web/enrich/bulk` | Bulk enrichment |
| GET | `/web/enrich/status/:id` | Enrichment status polling |
| POST | `/web/payments/checkout` | Stripe checkout session |
| POST/GET/DELETE | `/web/api-keys/` | API key management |
| GET | `/web/api-keys/usage` | API usage analytics |
| GET | `/web/api-keys/activity` | API activity log |
| POST | `/web/filters/` | AI-powered filter generation |

### Public API Routes (`/api/v1/*`) - API Key Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/enrich/` | Enrich a company |
| GET | `/api/v1/enrich/status` | Check enrichment status |

### Webhook Routes (`/webhook/*`) - Signature Verification

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/webhook/stripe` | Stripe SDK | Subscription lifecycle events |
| POST | `/webhook/clerk` | Svix | User sync events |

### Utility Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Health check |
| GET | `/metrics` | Basic Auth | Prometheus metrics |
| - | `/queuedash` | Basic Auth | BullMQ dashboard |
| WS | `/enrichment` | Clerk JWT | Real-time enrichment updates |

## Middleware Stack

Applied in order on every request:

1. `express.json()` - Body parsing (10MB limit, rawBody capture for webhooks)
2. `express.urlencoded()` - URL-encoded body parsing (10MB limit)
3. `clerkMiddleware()` - Clerk session management
4. `addRequestMetadata` - Request ID & IP tracking
5. `createHttpMetricsMiddleware()` - Prometheus HTTP metrics
6. `pinoHttp()` - Structured request logging
7. `cors()` - Cross-origin support (credentials: true)
8. `helmet()` - Security headers
9. `rateLimit()` - Global rate limiting (100 req/15min per IP)
10. `timeout()` - 5s request timeout

## Authentication

| Layer | Method | Applied To |
|-------|--------|-----------|
| **Clerk JWT** | `clerkMiddleware()` + DB lookup | `/web/*` routes |
| **API Key** | Bearer token + SHA-256 hash lookup | `/api/*` routes |
| **Basic Auth** | Username/password | `/queuedash`, `/metrics` |
| **Webhook Signatures** | HMAC verification | `/webhook/stripe`, `/webhook/clerk` |
| **WebSocket** | Clerk JWT in handshake | Socket.IO `/enrichment` namespace |

## Enrichment Pipeline

The enrichment engine uses a **waterfall pattern** - providers are tried in sequence until one succeeds:

### Company Enrichment (Phase 1)

1. Website scraping (Firecrawl / Rust HTML Service)
2. Company registry lookup (Pappers -> Forager)
3. Technology detection (pattern matching)
4. Social media extraction (LinkedIn, Facebook, Instagram)
5. WHOIS domain data
6. LLM analysis (LangChain)

### Contact Enrichment (Phase 2)

1. Email finding (IcyPeas -> Forager -> ContactOut)
2. Email verification (Million Verifier)
3. Phone lookup (Forager)
4. LinkedIn profile (IcyPeas -> Brightdata + LLM)

### Job Queue Architecture

Each operation type has its own BullMQ queue with configurable concurrency:

| Queue | Default Concurrency | Env Variable |
|-------|-------------------|--------------|
| Scraper | 10 | `SCRAPER_CONCURRENCY` |
| Company enrichment | 5 | `ENRICHMENT_COMPANY_CONCURRENCY` |
| Contact enrichment | 10 | `ENRICHMENT_CONTACT_CONCURRENCY` |
| Brightdata | 10 | `BRIGHTDATA_CONCURRENCY` |

Workers run in the same process as the API server (single-server mode). Real-time status updates are pushed via Redis pub/sub -> Socket.IO.

## Database

### Schema

25+ tables managed by Drizzle ORM. Key entities:

- **user** / **subscription** / **credits** - User accounts and billing
- **place** / **user_place** - Google Places data and user associations
- **enrichment** - Website enrichment (domain, social media, technology)
- **enrichment_company** - Business registry data (officers, UBOs, financials)
- **contact** / **contact_email** / **contact_phone** - Contact management
- **list** / **list_place** - User-curated place lists
- **search** / **search_place** - Saved searches
- **api_key** / **api_usage** - API key management and usage tracking
- **webhook_event** - Idempotent webhook processing

### Migration Commands

```bash
# Generate migration from schema changes
pnpm db:generate

# Apply pending migrations
pnpm db:migrate
```

Migrations are in `drizzle/` folder, auto-generated by `drizzle-kit generate`.

## Development

```bash
# Start dev server (with hot reload)
pnpm dev

# Build for production
pnpm build

# Type checking
pnpm typecheck

# Tests
pnpm test                    # Unit tests
pnpm test:integration        # Integration tests (requires DB)
pnpm test:integration:db:up  # Start test DB
pnpm test:integration:db:down # Stop test DB

# Local webhook forwarding
pnpm webhook:stripe:dev      # Requires Stripe CLI
pnpm webhook:clerk:dev       # Requires Svix CLI
```

## Environment Variables

See `.env.example` for the full list. Key groups:

| Group | Variables | Source |
|-------|-----------|--------|
| **Server** | `PORT`, `NODE_ENV`, `CORS_ORIGIN`, `LOG_LEVEL` | - |
| **Database** | `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` | Docker / Railway |
| **Redis** | `REDISHOST`, `REDISPORT`, `REDISUSER`, `REDISPASSWORD` | Docker / Railway |
| **Auth** | `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` | Clerk dashboard |
| **Payments** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_*_PRICE_ID` (15) | Stripe dashboard |
| **Google** | `GOOGLE_PLACES_API_KEY`, `GOOGLE_GEOCODING_API_KEY` | Google Cloud |
| **Enrichment** | `ICYPEAS_*`, `PAPPERS_*`, `FORAGER_*`, `BRIGHTDATA_*`, etc. | Provider dashboards |
| **LLM** | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `MISTRAL_API_KEY`, `GOOGLE_AI_API_KEY` | Provider dashboards |
| **Vector DB** | `QDRANT_API_KEY`, `QDRANT_URL`, `QDRANT_COLLECTION_NAME` | Qdrant |
| **HTML Service** | `RUST_HTML_SERVICE_URL`, `RUST_HTML_SERVICE_API_KEY` | Internal |
| **Monitoring** | `METRICS_USERNAME`, `METRICS_PASSWORD`, `SENTRY_AUTH_TOKEN` | - |
| **Admin** | `QUEUE_DASH_USERNAME`, `QUEUE_DASH_PASSWORD`, `SLACK_BOT_TOKEN` | - |
