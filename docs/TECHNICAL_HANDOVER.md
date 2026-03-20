# Ritchy - Technical Documentation & Handover

**Version:** 1.0

---

## Table of Contents

- [B.1 - Existing Technical Documentation](#b1--existing-technical-documentation)
- [B.2 - Full System Architecture](#b2--full-system-architecture)
- [B.3 - Key Technical Decisions (ADRs)](#b3--key-technical-decisions-adrs)
- [B.4 - Deployment Procedures](#b4--deployment-procedures)
- [B.5 - Environment Variables](#b5--environment-variables)
- [B.6 - Technical Walkthrough for Operational Autonomy](#b6--technical-walkthrough-for-operational-autonomy)

---

## B.1 -- Existing Technical Documentation

### README Inventory


| File                                                    | Purpose                                                                 |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `/README.md`                                            | Project overview, getting started, development workflow, code standards |
| `/apps/api/README.md`                                   | Backend architecture, domain-driven design, service structure           |
| `/apps/front/README.md`                                 | Frontend setup (React + TypeScript + Vite)                              |
| `/apps/html-service/README.md`                          | Rust HTML processing microservice documentation                         |
| `/apps/api/src/websocket/README.md`                     | WebSocket implementation with Socket.IO                                 |
| `/apps/front/src/api/README.md`                         | TanStack Query vs Mutation usage guide                                  |
| `/packages/metrics/README.md`                           | Prometheus metrics package guide (24+ metrics)                          |
| `/packages/metrics/METRICS_OVERVIEW.md`                 | Metrics implementation patterns, dashboard structure, best practices    |
| `/packages/metrics/grafana/GRAFANA_DASHBOARDS_GUIDE.md` | Grafana dashboard setup and usage                                       |
| `/packages/metrics/grafana/DASHBOARD_OVERVIEW.md`       | Dashboard panels overview                                               |
| `/docs/frontend-architecture-migration.md`              | Frontend architecture migration plan                                    |
| `/CLAUDE.md`                                            | Claude AI context guide for development assistance                      |
| `/.cursorrules`                                         | Cursor IDE development guidelines                                       |


### Additional Configuration Documentation


| File                              | Purpose                                    |
| --------------------------------- | ------------------------------------------ |
| `/.env.example`                   | Root environment variable template         |
| `/apps/api/.env.example`          | API environment variable template          |
| `/apps/front/.env.example`        | Frontend environment variable template     |
| `/apps/html-service/.env.example` | HTML service environment variable template |


---

## B.2 -- Full System Architecture

### Monorepo Structure

```
ritchy/
|-- apps/
|   |-- api/                    # Node.js Express backend (TypeScript)
|   |-- front/                  # React SPA frontend (TypeScript)
|   |-- html-service/           # Rust HTML processing microservice
|
|-- packages/
|   |-- logger/                 # @ritchy/logger - Structured logging (Pino)
|   |-- metrics/                # @ritchy/metrics - Prometheus metrics
|   |-- ts-config/              # @ritchy/ts-config - Shared TypeScript config
|
|-- docs/                       # Documentation
|-- .github/                    # CI/CD workflows & setup
|-- docker-compose.yml          # Local development infrastructure
|-- turbo.json                  # Turborepo task orchestration
|-- pnpm-workspace.yaml         # pnpm workspace definition
|-- prometheus.yml              # Prometheus scrape configuration
```

### Service Boundaries

```
                                  +---------------------+
                                  |    Clerk (Auth)      |
                                  +----------+----------+
                                             |
                  +------------+    JWT      |     +----------------+
    Browser  ---->|  Frontend  |<-----------+  |  Stripe (Pay)  |
    (React)       |  (Caddy)   |                +--------+-------+
                  |  :80/443   |                         |
                  +-----+------+                         | Webhooks
                        |                                |
                        | HTTP/WS                        |
                        v                                v
                  +-----+------+    +-----------+  +----+--------+
                  |   API      |<-->|  Redis    |  | Svix        |
                  |  (Express) |    |  :6379    |  | (Webhooks)  |
                  |  :3030     |    +-----------+  +-------------+
                  +--+---+--+--+
                     |   |  |
          +----------+   |  +----------+
          |              |             |
          v              v             v
   +------+-----+  +----+------+  +---+----------+
   | PostgreSQL  |  |  Qdrant   |  | HTML Service |
   |   :5432     |  | :6333     |  | (Rust) :3001 |
   +-------------+  +-----------+  +--------------+

   Monitoring Stack:
   +-------------+  +----------+  +-----------+
   | Prometheus  |  |  Loki    |  |  Grafana  |
   |   :9090     |  |  :3100   |  |   :3200   |
   +-------------+  +----------+  +-----------+
```

### Infrastructure Topology

#### Application Services


| Service          | Technology              | Port                      | Role                                                           |
| ---------------- | ----------------------- | ------------------------- | -------------------------------------------------------------- |
| **Frontend**     | React 18 + Vite + Caddy | 80/443 (prod), 5173 (dev) | Single-page application served via Caddy reverse proxy         |
| **API**          | Node.js 23 + Express 4  | 3030                      | REST API + WebSocket server, business logic, job orchestration |
| **HTML Service** | Rust (Actix Web)        | 3001                      | HTML processing, sanitization, markdown conversion             |


#### Data Stores


| Service        | Technology      | Port      | Role                                                                        |
| -------------- | --------------- | --------- | --------------------------------------------------------------------------- |
| **PostgreSQL** | PostgreSQL 15   | 5432      | Primary relational database (users, places, enrichments, subscriptions)     |
| **Redis**      | Redis Stack 7.2 | 6379      | Caching, BullMQ job queue, pub/sub for real-time updates, distributed locks |
| **Qdrant**     | Qdrant (latest) | 6333/6334 | Vector database for semantic search / RAG embeddings                        |


#### Observability Stack


| Service        | Technology   | Port | Role                                                       |
| -------------- | ------------ | ---- | ---------------------------------------------------------- |
| **Prometheus** | Prometheus   | 9090 | Metrics scraping & storage (15s interval)                  |
| **Loki**       | Grafana Loki | 3100 | Log aggregation from API and HTML service                  |
| **Grafana**    | Grafana      | 3200 | Dashboards and visualization (5 pre-configured dashboards) |


#### External Services


| Service                    | Purpose                                               |
| -------------------------- | ----------------------------------------------------- |
| **Clerk**                  | Authentication (JWT), user management, webhook events |
| **Stripe**                 | Subscription billing, checkout, customer portal       |
| **Google Maps/Places API** | Place search, details, geocoding, autocomplete        |
| **Mapbox**                 | Frontend map rendering and geocoding                  |
| **Sentry**                 | Error tracking (frontend + backend)                   |
| **PostHog**                | Product analytics and feature flags                   |
| **Slack**                  | Notifications (signups, subscriptions)                |
| **LangSmith**              | LLM tracing and observability                         |


#### Enrichment Data Providers


| Service                                      | Purpose                                |
| -------------------------------------------- | -------------------------------------- |
| **Pappers**                                  | French/European company registry data  |
| **Forager**                                  | People & company data, phone lookup    |
| **IcyPeas**                                  | Email finding, LinkedIn profile search |
| **Brightdata**                               | Web scraping, LinkedIn data collection |
| **Million Verifier**                         | Email verification                     |
| **ContactOut**                               | People search                          |
| **Firecrawl**                                | Website scraping & content extraction  |
| **WHOIS**                                    | Domain registration data               |
| **OpenAI / Anthropic / Mistral / Google AI** | LLM processing via LangChain           |


### Data Flow

#### 1. Search Flow

```
User enters search query
    |
    v
Frontend --> GET /web/searches --> Google Places API (text search)
    |                                     |
    |                              Places upserted to PostgreSQL
    |                                     |
    v                                     v
Frontend receives search results <-- UserPlace junction created
    |
    v
Map + Table display (Mapbox GL + TanStack Table)
```

#### 2. Enrichment Flow

```
User triggers enrichment (single or bulk)
    |
    v
POST /web/enrich/company or /web/enrich/contact
    |
    v
BullMQ Job created --> Redis queue
    |
    v
Worker picks up job:
    |
    +-- Phase 1: Company Enrichment
    |   |-- Website scraping (Firecrawl / Rust HTML Service)
    |   |-- Company registry lookup (Pappers / Forager waterfall)
    |   |-- Technology detection
    |   |-- Social media extraction
    |   |-- WHOIS domain data
    |   |-- LLM analysis (LangChain)
    |
    +-- Phase 2: Contact Enrichment
        |-- Email finding (IcyPeas / Forager waterfall)
        |-- Email verification (Million Verifier)
        |-- Phone lookup (Forager)
        |-- LinkedIn profile (IcyPeas / Brightdata + LLM)
    |
    v
Results stored in PostgreSQL (enrichment_* tables)
    |
    v
Real-time status updates via:
    Primary: WebSocket (Socket.IO) --> Frontend
    Fallback: HTTP polling (2s + jitter)
```

#### 3. Authentication Flow

```
User visits app
    |
    v
Clerk SignIn component
    |
    v
Clerk issues JWT --> Stored in browser
    |
    v
Every API request:
    Frontend: useAuth().getToken() --> Authorization: Bearer <JWT>
    |
    v
API: clerkMiddleware() --> getAuth(req) --> DB lookup by clerkId
    |
    v
req.auth = { userId, email, firstName, lastName, clerkId }
```

#### 4. Payment Flow

```
User selects plan
    |
    v
POST /web/payments/checkout --> Stripe Checkout Session
    |
    v
Redirect to Stripe --> Payment processed
    |
    v
Stripe Webhook --> POST /webhook/stripe
    |
    v
Subscription created/updated in DB + Credits allocated
    |
    v
Slack notification sent
```

### Backend Service Architecture

```
apps/api/src/
|-- index.ts                    # Entry point, middleware stack, server setup
|-- config/                     # External service configurations
|   |-- clerk.ts                # Clerk auth config
|   |-- drizzle.ts              # Database connection
|   |-- redis.ts                # Redis connection
|   |-- stripe.ts               # Stripe + plan pricing
|   |-- llms.ts                 # LLM API keys
|   |-- basic_auth.ts           # Basic auth credentials
|
|-- db/                         # Database layer
|   |-- db.ts                   # Drizzle instance
|   |-- schema/                 # 25+ table definitions
|   |-- migrate.ts              # Migration runner
|   |-- monitoring.ts           # DB query metrics
|
|-- services/                   # Domain-driven business logic
|   |-- enrichment/             # Core enrichment engine
|   |   |-- company/            # Company enrichment (scraper, governmental)
|   |   |-- contact/            # Contact enrichment (email, phone, linkedin)
|   |   |-- shared/             # Shared enrichment utilities, status manager
|   |-- payment/                # Subscription & credits
|   |-- api_keys/               # API key management (AES-256 encryption)
|   |-- contact/                # Contact CRUD operations
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
|-- routes_web/                 # Clerk-authenticated web routes
|-- routes_api/                 # API key-authenticated public routes
|-- webhook/                    # Stripe & Clerk webhook handlers
|-- websocket/                  # Socket.IO namespaces
|-- metrics/                    # Prometheus metric definitions
|-- types/                      # TypeScript type definitions
|-- utils/                      # Utility functions
|-- shared/                     # Shared helpers
```

### Frontend Feature Architecture

```
apps/front/src/
|-- main.tsx                    # Entry point (React 18 + Sentry + PostHog)
|-- App.tsx                     # Provider stack (Clerk > Query > Theme > WS > Router)
|-- router.tsx                  # TanStack Router configuration
|
|-- routes/                     # File-based routing (TanStack Router)
|   |-- __root.tsx              # Root layout
|   |-- _auth.tsx               # Protected layout (Clerk guard)
|   |-- index.tsx               # Public login page
|   |-- _auth/
|       |-- search/             # Search interface (map + options)
|       |-- leads.tsx           # Leads table (data table + filters + map)
|       |-- lists/              # List management
|       |-- api-keys.tsx        # API key management
|       |-- api-playground.tsx  # API testing tool
|       |-- import.tsx          # CSV import
|       |-- pricing.tsx         # Pricing page
|       |-- checkout.tsx        # Stripe checkout
|
|-- api/                        # Data layer
|   |-- queries/                # TanStack Query read operations
|   |-- mutations/              # TanStack Query write operations
|
|-- components/                 # UI components
|   |-- ui/                     # Shadcn/UI primitives (Button, Card, Dialog, etc.)
|   |-- data-table/             # Advanced data table with virtual scrolling
|   |-- filters/                # Dynamic filter system
|   |-- search/                 # Search interface components
|   |-- enrichment/             # Enrichment status display
|   |-- contact/                # Contact management
|   |-- company-display/        # Company detail sections
|   |-- map-display/            # Mapbox integration
|   |-- sidebar/                # Navigation sidebar
|   |-- payment/                # Stripe integration
|   |-- import/                 # CSV import interface
|   |-- lists/                  # List management
|   |-- api-keys/               # API key UI
|   |-- api-playground/         # API testing interface
|
|-- contexts/                   # React Context providers
|   |-- WebSocketContext.tsx     # Real-time enrichment subscriptions
|   |-- FilterOptionsContext.tsx # Server-side filter options
|   |-- SelectionContext.tsx     # Place selection state
|   |-- TableSelectionContext.tsx # Table row selection
|   |-- EnrichmentMutationContext.tsx # Shared enrichment mutations
|
|-- hooks/                      # Custom React hooks
|   |-- useApi.ts               # API client hooks (useApiQuery, useApiMutation)
|
|-- providers/
|   |-- query-provider.tsx      # TanStack Query (staleTime: 5min, gcTime: 2h)
|   |-- theme-provider.tsx      # Dark/light mode
|
|-- lib/
|   |-- api/createApiClient.ts  # HTTP client with auth injection
|   |-- utils/                  # Utility functions (cn, formatters)
|   |-- validation.ts           # Zod schemas
```

### Database Schema Overview

```
                    +----------+
                    |   user   |
                    +----+-----+
                         |
          +--------------+--------------+
          |              |              |
    +-----+------+ +----+-----+ +------+------+
    |subscription| |  credits  | |  api_key    |
    +------------+ +-----------+ +------+------+
                                        |
                                  +-----+------+
                                  |  api_usage |
                                  +------------+
          |
    +-----+------+        +----------+
    | user_place  |<------>|  place   |
    +-----+------+        +----------+
          |
    +-----+-----+-----+-----+-----+
    |     |     |     |     |     |
  note  status list  contact search
              place          |
                       +-----+-----+-----+
                       |     |     |     |
                     email phone social linkedin
                                   media

    +------ enrichment ------+
    |  (per place, unique)   |
    +---+----+----+----+-----+
        |    |    |    |
     email phone social company
                 media    |
                    +-----+-----+-----+-----+
                    |     |     |     |     |
                 officer UBO  estab. financ. activity
                    |
              +-----+-----+
              |     |     |
            email phone linkedin
```

**Core Entities:**

- **user**: Clerk-synced users with email, name
- **subscription**: Stripe subscription with plan tier (FREE/STARTER/GROWTH/ESSENTIALS/PRO/ENTERPRISE)
- **credits**: Per-user credit balance for enrichment operations
- **place**: Google Places data (address, rating, phone, hours, reviews, etc.)
- **user_place**: Junction table linking users to places they've saved
- **enrichment**: Website enrichment data (domain, description, social media, technology)
- **enrichment_company**: Governmental business registry data (company number, officers, financials)
- **contact**: User-created or auto-discovered contacts linked to places
- **list**: User-curated lists of places
- **search**: Saved search history with geographic bounds
- **api_key**: Encrypted API keys with usage tracking
- **webhook_event**: Idempotent webhook processing log

### Technology Stack Summary


| Layer            | Technology                  | Version |
| ---------------- | --------------------------- | ------- |
| **Frontend**     | React                       | 18.3.1  |
|                  | TanStack Router             | 1.139.7 |
|                  | TanStack Query              | 5.90.11 |
|                  | TanStack Table              | 8.21.3  |
|                  | Tailwind CSS                | 3.4.16  |
|                  | Shadcn/UI (Radix)           | Latest  |
|                  | Vite                        | 5.4.16  |
|                  | Zustand                     | 5.0.3   |
|                  | Mapbox GL                   | 3.8.0   |
|                  | Framer Motion               | 12.15.0 |
| **Backend**      | Node.js                     | 23.9.0  |
|                  | Express                     | 4.21.1  |
|                  | Drizzle ORM                 | 0.36.4  |
|                  | BullMQ                      | 5.56.8  |
|                  | Socket.IO                   | 4.8.1   |
|                  | Zod                         | 3.25.76 |
|                  | LangChain                   | 1.1.0+  |
| **HTML Service** | Rust                        | 1.83    |
| **Data**         | PostgreSQL                  | 15      |
|                  | Redis Stack                 | 7.2.0   |
|                  | Qdrant                      | Latest  |
| **Auth**         | Clerk                       | 1.3.18  |
| **Payments**     | Stripe                      | 17.6.0  |
| **Monitoring**   | Prometheus + Grafana + Loki | Latest  |
| **Build**        | Turborepo                   | 2.3.4   |
|                  | pnpm                        | 9.15.0  |
|                  | Biome                       | 1.9.4   |
|                  | TypeScript                  | 5.7.2   |


---

## B.3 -- Key Technical Decisions (ADRs)

### ADR-001: Monorepo with Turborepo + pnpm

**Context:** The project requires a frontend, backend, and shared packages with consistent tooling and versioning.

**Decision:** Use a Turborepo monorepo with pnpm workspaces.

**Alternatives considered:**

- Nx (heavier, more opinionated)
- Separate repositories (harder to share types and ensure consistency)
- Lerna (less maintained, slower builds)

**Consequences:**

- Single `pnpm install` for all packages
- Shared TypeScript configuration via `@ritchy/ts-config`
- Task caching and parallel execution via Turborepo
- Workspace protocol (`workspace:`*) for inter-package dependencies
- Build graph ensures packages build before apps that depend on them
- Trade-off: all code in one repo increases clone size; CI runs all checks even for unrelated changes

---

### ADR-002: React + TanStack Router (File-Based Routing)

**Context:** Need a performant SPA with type-safe routing and URL-synced state.

**Decision:** React 18 with TanStack Router for file-based, type-safe routing.

**Alternatives considered:**

- Next.js (SSR not needed, adds complexity for a dashboard app)
- React Router v6 (less type-safe, no file-based routing)
- Remix (SSR-focused, over-engineered for this use case)

**Consequences:**

- Routes are defined by file structure in `src/routes/`
- Full TypeScript inference for route params and search params
- URL-synced filter state (pagination, sorting, filters all in URL)
- Layout routes (`_auth.tsx`) for authentication guards
- Preloading on hover via `defaultPreload: 'intent'`
- Trade-off: TanStack Router is newer with a smaller community than React Router

---

### ADR-003: Drizzle ORM for Database Access

**Context:** Need a type-safe database layer with good migration support for PostgreSQL.

**Decision:** Drizzle ORM with postgres-js driver.

**Alternatives considered:**

- Prisma (heavier runtime, slower cold starts, less control over queries)
- Knex (less type-safe, more manual)
- TypeORM (class-based, conflicts with functional programming style)
- Raw SQL (no type safety)

**Consequences:**

- Schema defined in TypeScript (`src/db/schema/`)
- Migrations generated via `drizzle-kit generate` and run via `drizzle-orm/migrator`
- Full TypeScript inference for queries and inserts
- Lightweight runtime (no query engine binary like Prisma)
- Direct SQL-like query builder
- Trade-off: Drizzle is newer with less ecosystem support than Prisma

---

### ADR-004: Clerk for Authentication

**Context:** Need user authentication with social logins, session management, and webhook events.

**Decision:** Clerk for both frontend (React SDK) and backend (Express middleware).

**Alternatives considered:**

- Auth0 (more expensive at scale, more complex setup)
- NextAuth/Lucia (requires Next.js or custom implementation)
- Firebase Auth (vendor lock-in to Google ecosystem)
- Custom JWT implementation (security risk, maintenance burden)

**Consequences:**

- Frontend: `<ClerkProvider>` + `<SignedIn>/<SignedOut>` guards
- Backend: `clerkMiddleware()` + `getAuth(req)` for JWT verification
- User sync via Clerk webhooks (POST /webhook/clerk) using Svix for signature verification
- Clerk `userId` stored as `clerkId` in local user table
- Trade-off: dependency on Clerk's availability; user data split between Clerk and local DB

---

### ADR-005: Stripe for Subscription Billing

**Context:** Need subscription-based billing with multiple plan tiers and credit allocation.

**Decision:** Stripe Checkout + Customer Portal with webhook-driven subscription management.

**Alternatives considered:**

- Paddle (simpler but less flexible)
- LemonSqueezy (less mature)
- Custom billing (enormous compliance and maintenance burden)

**Consequences:**

- Checkout sessions created server-side, redirect to Stripe-hosted page
- Subscription lifecycle managed entirely via webhooks (created, updated, deleted)
- 6 plan tiers: FREE, STARTER, GROWTH, ESSENTIALS, PRO, ENTERPRISE
- 3 billing intervals: monthly, quarterly, yearly
- Each plan price ID stored as environment variable
- Credits allocated on subscription activation
- Idempotent webhook processing via `webhook_event` table
- Trade-off: Stripe fees (2.9% + 30c); webhook-driven architecture requires careful error handling

---

### ADR-006: BullMQ for Job Queue Processing

**Context:** Enrichment operations involve multiple external API calls that can take minutes. Need async processing with retry, concurrency control, and real-time progress updates.

**Decision:** BullMQ backed by Redis for all async job processing.

**Alternatives considered:**

- RabbitMQ (more complex setup, config in .env.example but not used)
- AWS SQS (vendor lock-in, no built-in dashboard)
- Temporal (over-engineered for current scale)
- In-process (blocks API server, no retry)

**Consequences:**

- Dedicated queue per operation type (scraper, enrichment-company, enrichment-contact, etc.)
- Per-provider queues for rate limiting (icypeas, forager, brightdata, etc.)
- Configurable concurrency per queue via environment variables
- QueueDash dashboard at `/queuedash` for monitoring
- Workers run in the same process as the API server (single-server mode)
- Real-time status via Redis pub/sub + Socket.IO
- Trade-off: single-process model limits horizontal scaling; future plan for Redis pub/sub adapter for multi-server

---

### ADR-007: Waterfall Pattern for Multi-Provider Data Enrichment

**Context:** Each enrichment data point (email, phone, company info) can come from multiple providers with varying reliability, coverage, and cost.

**Decision:** Implement a waterfall pattern that tries providers in sequence until one succeeds.

**Alternatives considered:**

- Parallel requests to all providers (wasteful, expensive)
- Single provider per data type (single point of failure)
- User-selectable providers (too complex for UX)

**Consequences:**

- Provider priority order configurable per data type
- Automatic fallback: if Provider A fails or returns no data, try Provider B
- Examples:
  - Company lookup: Pappers (France) -> Forager (UK, DE, etc.)
  - Email finding: IcyPeas -> Forager -> ContactOut
  - Phone: Forager
  - LinkedIn: IcyPeas -> Brightdata + LLM analysis
- Each provider has its own BullMQ queue for rate limiting
- Trade-off: sequential execution is slower than parallel; priority tuning requires empirical data

---

### ADR-008: Socket.IO for Real-Time Updates

**Context:** Enrichment processes take 10-60 seconds. Users need real-time progress feedback.

**Decision:** Socket.IO with namespace-based architecture for real-time enrichment status.

**Alternatives considered:**

- Server-Sent Events (simpler but unidirectional, no room/subscription model)
- WebSocket raw (no automatic reconnection, room management)
- Long polling only (higher latency, more server load)

**Consequences:**

- `/enrichment` namespace for status updates
- Batch subscription model (subscribe to multiple enrichment IDs)
- Clerk JWT authentication on WebSocket connections
- 45-minute token refresh interval
- Frontend: WebSocket-first with HTTP polling fallback (2s + jitter)
- Debounced batch emissions (50ms window) for performance
- LRU cache for completion deduplication
- Trade-off: single-server Socket.IO (in-memory); horizontal scaling requires Redis adapter (planned but not implemented)

---

### ADR-009: Rust HTML Service Microservice

**Context:** HTML processing (sanitization, parsing, markdown conversion) is CPU-intensive and can block the Node.js event loop.

**Decision:** Extract HTML processing into a separate Rust microservice.

**Alternatives considered:**

- Node.js with Cheerio/JSDOM (slower, blocks event loop)
- WebAssembly in Node.js (complex build pipeline)
- Python with BeautifulSoup (slower, adds new language)

**Consequences:**

- Rust binary for maximum performance and memory safety
- HTTP API at port 3001 with API key authentication
- Health check endpoint for container orchestration
- Configurable max HTML size (default 10MB)
- Feature-flagged: `USE_RUST_HTML_SERVICE=true` to enable
- Fallback: Node.js Cheerio/JSDOM still available if service is down
- Trade-off: additional operational complexity; requires Rust toolchain for development

---

### ADR-010: Biome for Linting and Formatting

**Context:** Need fast, consistent code formatting and linting across the monorepo.

**Decision:** Biome (successor to Rome) for both linting and formatting.

**Alternatives considered:**

- ESLint + Prettier (slower, two tools to configure)
- dprint (less mature linting)
- oxlint (no formatting)

**Consequences:**

- Single tool for linting and formatting
- Significantly faster than ESLint + Prettier
- Configured at root level with per-package overrides
- Single quotes, no semicolons, 2-space indent, 80-char line width
- `pnpm check` for linting, `pnpm format:fix` for formatting
- Trade-off: smaller plugin ecosystem than ESLint; some rules not yet available

---

### ADR-011: Functional Programming Style (No Classes)

**Context:** Need a consistent code style across the monorepo.

**Decision:** Strictly functional programming: no classes, pure functions, arrow function syntax, named exports.

**Alternatives considered:**

- OOP with classes (common in enterprise Node.js)
- Mixed style (inconsistent, harder to enforce)

**Consequences:**

- All functions are `const fn = () => {}` arrow functions
- No `class` keyword anywhere in the codebase
- React: functional components only, no class components
- Services organized as modules of pure functions, not class instances
- State managed through closures, context, and stores (Zustand)
- Trade-off: some patterns (e.g., dependency injection) are less natural without classes

---

### ADR-012: TanStack Query for Server State Management

**Context:** The frontend needs efficient data fetching with caching, invalidation, and real-time updates.

**Decision:** TanStack Query (React Query v5) for all server state, complemented by Zustand for minimal client state and URL state for filters/pagination.

**Alternatives considered:**

- SWR (fewer features, no mutation management)
- Redux + RTK Query (heavier, more boilerplate)
- Apollo Client (GraphQL-focused, not applicable to REST)

**Consequences:**

- Queries organized in `src/api/queries/` by domain
- Mutations in `src/api/mutations/` by domain
- Custom hooks: `useApiQuery` and `useApiMutation` wrap TanStack Query with auth injection
- Global config: staleTime 5min, gcTime 2h, 1 retry
- Automatic cache invalidation on mutation success
- Optimistic updates for enrichment status
- URL-synced state for filters, pagination, sorting (via TanStack Router search params)
- Trade-off: complex invalidation logic for nested data; requires careful query key management

---

### ADR-013: Observability Stack (Prometheus + Grafana + Loki)

**Context:** Need monitoring, alerting, and log aggregation for production operations.

**Decision:** Self-hosted Prometheus + Grafana + Loki stack with custom @ritchy/metrics package.

**Alternatives considered:**

- Datadog (expensive, vendor lock-in)
- New Relic (expensive)
- CloudWatch (AWS-specific)
- OpenTelemetry + Jaeger (more complex setup for current needs)

**Consequences:**

- `@ritchy/metrics` package wraps prom-client with Express middleware
- 24+ custom metrics across 7 categories (HTTP, enrichment, queue, DB, external API, WebSocket, Node.js runtime)
- 5 pre-configured Grafana dashboards (overview, production, enrichment, queues, external APIs)
- Loki integration via pino-loki transport
- `/metrics` endpoint with Basic Auth protection
- Redis-based metric aggregation for future multi-process support
- Trade-off: self-hosted requires maintenance; no built-in alerting (needs Grafana alert rules)

---

## B.4 -- Deployment Procedures

### Hosting Platform

All services are deployed on **Railway** (railway.app).

### Environment Overview


| Environment     | Branch    | URL Pattern                                  | Purpose                                |
| --------------- | --------- | -------------------------------------------- | -------------------------------------- |
| **Development** | Local     | localhost:5173 (front), localhost:3030 (api) | Local development with Docker services |
| **Staging**     | `staging` | staging.ritchy.io (approx.)                  | Pre-production testing                 |
| **Production**  | `master`  | app.ritchy.io (approx.)                      | Live user-facing environment           |


### CI/CD Pipeline (GitHub Actions)

#### Trigger Flow

```
Developer pushes to feature branch
    |
    v
Pull Request opened to staging
    |
    v
CI Pipeline (.github/workflows/ci.yml):
    |-- lint (pnpm check - Biome)
    |-- typecheck (pnpm typecheck - TypeScript)
    |-- test (pnpm test - Vitest)
    |-- migrate (pnpm db:migrate - against test PostgreSQL 15)
    |
    v
[Optional] Claude PR Review (if --review in title):
    |-- Auto-generates PR description
    |-- Code review with inline comments
    |-- Linear ticket integration
    |-- Cost tracking
    |
    v
Manual review (2 engineers required)
    |
    v
Merge to staging --> Railway auto-deploys staging
    |
    v
QA on staging environment
    |
    v
Merge staging to master --> Railway auto-deploys production
```

#### CI Jobs Detail

**Lint Job:**

```bash
pnpm check  # Runs Biome linter across all workspaces
```

**Typecheck Job:**

```bash
pnpm typecheck  # Runs tsc --noEmit across all workspaces
# Depends on @ritchy/logger#build and @ritchy/metrics#build
```

**Test Job:**

```bash
pnpm test  # Runs Vitest across all workspaces
```

**Migrate Job:**

```bash
# Sets up PostgreSQL 15 (postgres:postgres@localhost:5432/ritchy)
pnpm db:migrate  # Runs Drizzle migrations to verify compatibility
```

### Step-by-Step Deployment: Development

```bash
# 1. Clone and install
git clone <repo-url>
cd ritchy
pnpm install

# 2. Start infrastructure (PostgreSQL, Redis, Qdrant, Loki, Prometheus, Grafana)
docker-compose up -d

# 3. Set up environment variables
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/front/.env.example apps/front/.env
cp apps/html-service/.env.example apps/html-service/.env
# Fill in all required values (see B.5)

# 4. Run database migrations
pnpm db:migrate

# 5. Start development servers
pnpm dev
# API: http://localhost:3030
# Frontend: http://localhost:5173
# Storybook: http://localhost:6006
# Grafana: http://localhost:3200 (admin/admin)
```

### Step-by-Step Deployment: Production (Railway)

Railway auto-deploys from the `master` branch. Each service has its own Railway service configuration:

**API Service:**

1. Railway detects `apps/api/Dockerfile`
2. Multi-stage build: `node:22-alpine` base, turbo prune, pnpm install, tsup build
3. Runs as non-root user (expressjs:1001)
4. Entry: `node apps/api/dist/index.js`
5. Port: 3030
6. Health check: `GET /health`

**Frontend Service:**

1. Railway uses `apps/front/nixpacks.toml` configuration
2. Build: pnpm install, tsc, vite build
3. Install Caddy v2.8.4
4. Serve static files via Caddy with security headers
5. Port: 80
6. SPA fallback: all routes rewrite to `index.html`

**HTML Service:**

1. Railway detects `apps/html-service/Dockerfile`
2. Multi-stage Rust build (1.83-slim)
3. Runtime: debian:bookworm-slim
4. Port: 3001
5. Health check: `GET /health`

### Database Migration Strategy During Deploys

**Pre-deployment:**

- CI `migrate` job validates migrations against a fresh PostgreSQL 15 instance
- Migrations are additive-only (new tables, columns, indexes)

**During deployment:**

- API service runs `pnpm db:migrate` on startup (via the migrate.ts script)
- Uses `max: 1` connection to prevent concurrent migration issues
- Drizzle migrator runs all pending migrations from `apps/api/drizzle/` folder
- Migration files are auto-generated by `drizzle-kit generate` and checked into git

**Migration workflow:**

```bash
# 1. Modify schema in apps/api/src/db/schema/
# 2. Generate migration
pnpm db:generate
# 3. Review generated SQL in apps/api/drizzle/XXXX_*.sql
# 4. Test locally
pnpm db:migrate
# 5. Commit migration file with schema changes
```

### Rollback Procedures

**Application Rollback:**

1. Railway supports instant rollback to previous deployment
2. Navigate to Railway dashboard > Service > Deployments
3. Click "Rollback" on the previous successful deployment

**Database Rollback:**

- Drizzle does not support automatic down migrations
- For critical issues: manually write a reverse SQL migration
- For data issues: restore from Railway's database backup
- Prevention: always test migrations in CI and staging before production

**Emergency Procedures:**

```bash
# Revert the merge commit on master
git revert <merge-commit-hash>
git push origin master
# Railway auto-deploys the revert

# If database migration caused issues:
# 1. Connect to production database
# 2. Manually reverse the schema change
# 3. Mark the migration as rolled back in drizzle migrations table
```

---

## B.5 -- Environment Variables

### Complete Inventory

#### Root Level (`.env.example`)


| Variable            | Service    | Format   | Description                        |
| ------------------- | ---------- | -------- | ---------------------------------- |
| `PGHOST`            | PostgreSQL | hostname | Database host (e.g., `localhost`)  |
| `PGPORT`            | PostgreSQL | number   | Database port (e.g., `5432`)       |
| `PGUSER`            | PostgreSQL | string   | Database user (e.g., `postgres`)   |
| `PGPASSWORD`        | PostgreSQL | string   | Database password                  |
| `PGDATABASE`        | PostgreSQL | string   | Database name (e.g., `ritchy`)     |
| `PGVECTORHOST`      | PostgreSQL | hostname | Vector DB host (separate instance) |
| `PGVECTORPORT`      | PostgreSQL | number   | Vector DB port                     |
| `PGVECTORUSER`      | PostgreSQL | string   | Vector DB user                     |
| `PGVECTORPASSWORD`  | PostgreSQL | string   | Vector DB password                 |
| `PGVECTORDATABASE`  | PostgreSQL | string   | Vector DB name                     |
| `REDISHOST`         | Redis      | hostname | Redis host (e.g., `localhost`)     |
| `REDISPORT`         | Redis      | number   | Redis port (e.g., `6379`)          |
| `REDISUSER`         | Redis      | string   | Redis username                     |
| `REDISPASSWORD`     | Redis      | string   | Redis password                     |
| `RABBITMQ_USER`     | RabbitMQ   | string   | *Not currently used*               |
| `RABBITMQ_HOST`     | RabbitMQ   | hostname | *Not currently used*               |
| `RABBITMQ_PASSWORD` | RabbitMQ   | string   | *Not currently used*               |
| `RABBITMQ_VHOST`    | RabbitMQ   | string   | *Not currently used*               |
| `RABBITMQ_PORT`     | RabbitMQ   | number   | *Not currently used*               |


#### API Service (`apps/api/.env.example`)

**Core Configuration:**


| Variable            | Format                                        | Description                                  |
| ------------------- | --------------------------------------------- | -------------------------------------------- |
| `NODE_ENV`          | `development` / `production`                  | Runtime environment                          |
| `PORT`              | number                                        | API server port (default: `3030`)            |
| `CORS_ORIGIN`       | URL or `*`                                    | Allowed CORS origins                         |
| `FRONTEND_BASE_URL` | URL                                           | Frontend URL (e.g., `http://localhost:5173`) |
| `BASE_URL`          | URL                                           | API base URL (e.g., `http://localhost:3030`) |
| `SESSION_SECRET`    | string                                        | Express session secret                       |
| `LOG_LEVEL`         | `trace`/`debug`/`info`/`warn`/`error`/`fatal` | Logging verbosity                            |


**Database (inherited from root or overridden):**


| Variable           | Format | Description                         |
| ------------------ | ------ | ----------------------------------- |
| `PG_PUBLIC_URL`    | URL    | Public PostgreSQL connection string |
| `PGMAX`            | number | Max database connections            |
| `PGMIN`            | number | Min database connections            |
| `REDIS_PUBLIC_URL` | URL    | Public Redis connection string      |


**Authentication:**


| Variable                | Source                     | Description                          |
| ----------------------- | -------------------------- | ------------------------------------ |
| `CLERK_PUBLISHABLE_KEY` | Clerk dashboard            | Public key for Clerk SDK             |
| `CLERK_SECRET_KEY`      | Clerk dashboard            | Secret key for server-side auth      |
| `CLERK_WEBHOOK_SECRET`  | Clerk dashboard > Webhooks | HMAC secret for webhook verification |


**Payments:**


| Variable                            | Source                      | Description                            |
| ----------------------------------- | --------------------------- | -------------------------------------- |
| `STRIPE_SECRET_KEY`                 | Stripe dashboard            | API secret key                         |
| `STRIPE_PUBLIC_KEY`                 | Stripe dashboard            | Publishable key                        |
| `STRIPE_WEBHOOK_SECRET`             | Stripe dashboard > Webhooks | Webhook endpoint secret                |
| `STRIPE_STARTER_PRODUCT_ID`         | Stripe Products             | Product ID for Starter plan            |
| `STRIPE_GROWTH_PRODUCT_ID`          | Stripe Products             | Product ID for Growth plan             |
| `STRIPE_ESSENTIALS_PRODUCT_ID`      | Stripe Products             | Product ID for Essentials plan         |
| `STRIPE_PRO_PRODUCT_ID`             | Stripe Products             | Product ID for Pro plan                |
| `STRIPE_ENTERPRISE_PRODUCT_ID`      | Stripe Products             | Product ID for Enterprise plan         |
| `STRIPE_{PLAN}_{INTERVAL}_PRICE_ID` | Stripe Prices               | Price IDs per plan/interval (15 total) |


**Google APIs:**


| Variable                   | Source               | Description               |
| -------------------------- | -------------------- | ------------------------- |
| `GOOGLE_PLACES_API_KEY`    | Google Cloud Console | Places API key            |
| `GOOGLE_GEOCODING_API_KEY` | Google Cloud Console | Geocoding API key         |
| `GOOGLE_PLACES_REFERRER`   | Google Cloud Console | HTTP referrer restriction |
| `GOOGLE_CLIENT_ID`         | Google Cloud Console | OAuth client ID           |
| `GOOGLE_CLIENT_SECRET`     | Google Cloud Console | OAuth client secret       |
| `GOOGLE_REDIRECT_URI`      | Google Cloud Console | OAuth redirect URI        |
| `GOOGLE_CALENDAR_API_KEY`  | Google Cloud Console | Calendar API key          |


**Enrichment Data Providers:**


| Variable                   | Source                     | Description                 |
| -------------------------- | -------------------------- | --------------------------- |
| `ICYPEAS_API_KEY`          | IcyPeas dashboard          | Email finding API key       |
| `ICYPEAS_EMAIL`            | IcyPeas dashboard          | Account email               |
| `PAPPERS_API_KEY`          | Pappers dashboard          | French company data API key |
| `FORAGER_API_KEY`          | Forager dashboard          | People data API key         |
| `FORAGER_ACCOUNT_ID`       | Forager dashboard          | Account identifier          |
| `BRIGHTDATA_API_KEY`       | Brightdata dashboard       | Web scraping API key        |
| `MILLION_VERIFIER_API_KEY` | Million Verifier dashboard | Email verification key      |
| `CONTACTOUT_API_KEY`       | ContactOut dashboard       | People search key           |
| `FIRECRAWL_API_KEY`        | Firecrawl dashboard        | Website scraping key        |
| `WHOIS_API_KEY`            | WHOIS API provider         | Domain data key             |


**AI / LLM:**


| Variable            | Source              | Description                               |
| ------------------- | ------------------- | ----------------------------------------- |
| `OPENAI_API_KEY`    | OpenAI dashboard    | OpenAI API key                            |
| `ANTHROPIC_API_KEY` | Anthropic dashboard | Claude API key                            |
| `MISTRAL_API_KEY`   | Mistral dashboard   | Mistral API key                           |
| `GOOGLE_AI_API_KEY` | Google AI Studio    | Gemini API key                            |
| `LANGSMITH_API_KEY` | LangSmith dashboard | LLM tracing key                           |
| `LANGSMITH_TRACING` | -                   | Enable LangSmith tracing (`true`/`false`) |


**Vector Database:**


| Variable                 | Format | Description                    |
| ------------------------ | ------ | ------------------------------ |
| `QDRANT_API_KEY`         | string | Qdrant authentication key      |
| `QDRANT_URL`             | URL    | Qdrant server URL              |
| `QDRANT_COLLECTION_NAME` | string | Collection name for embeddings |


**Rust HTML Service:**


| Variable                       | Format         | Description                                    |
| ------------------------------ | -------------- | ---------------------------------------------- |
| `RUST_HTML_SERVICE_URL`        | URL            | Service URL (default: `http://localhost:3001`) |
| `RUST_HTML_SERVICE_API_KEY`    | string         | API key for service authentication             |
| `RUST_HTML_SERVICE_TIMEOUT_MS` | number         | Request timeout in ms (default: `30000`)       |
| `USE_RUST_HTML_SERVICE`        | `true`/`false` | Feature flag to enable service                 |


**Job Queue Concurrency:**


| Variable                              | Format | Default | Description                                 |
| ------------------------------------- | ------ | ------- | ------------------------------------------- |
| `SCRAPER_CONCURRENCY`                 | number | `10`    | Concurrent scraping jobs                    |
| `BRIGHTDATA_CONCURRENCY`              | number | `10`    | Concurrent Brightdata requests              |
| `ENRICHMENT_UNIT_CONCURRENCY`         | number | `10`    | Concurrent enrichment units                 |
| `ENRICHMENT_COMPANY_CONCURRENCY`      | number | `5`     | Concurrent company enrichments              |
| `ENRICHMENT_CONTACT_CONCURRENCY`      | number | `10`    | Concurrent contact enrichments              |
| `SCRAPER_BATCH_EXIT_COUNT`            | number | `1`     | Batch exit threshold for scraper            |
| `ENRICHMENT_COMPANY_BATCH_EXIT_COUNT` | number | `1`     | Batch exit threshold for company enrichment |


**Monitoring & Admin:**


| Variable              | Format | Description                          |
| --------------------- | ------ | ------------------------------------ |
| `METRICS_USERNAME`    | string | Basic Auth username for `/metrics`   |
| `METRICS_PASSWORD`    | string | Basic Auth password for `/metrics`   |
| `QUEUE_DASH_USERNAME` | string | Basic Auth username for `/queuedash` |
| `QUEUE_DASH_PASSWORD` | string | Basic Auth password for `/queuedash` |
| `SENTRY_AUTH_TOKEN`   | string | Sentry release upload token          |
| `SLACK_BOT_TOKEN`     | string | Slack bot token for notifications    |


#### Frontend (`apps/front/.env.example`)


| Variable                        | Source            | Description                                          |
| ------------------------------- | ----------------- | ---------------------------------------------------- |
| `NODE_ENV`                      | -                 | `development` or `production`                        |
| `VITE_MAPBOX_ACCESS_TOKEN`      | Mapbox dashboard  | Map rendering token                                  |
| `VITE_CLERK_PUBLISHABLE_KEY`    | Clerk dashboard   | Frontend auth key                                    |
| `VITE_STRIPE_PUBLIC_KEY`        | Stripe dashboard  | Publishable key for Stripe.js                        |
| `VITE_RITCHY_INTERNAL_BASE_URL` | -                 | Internal API URL (e.g., `http://localhost:3030/web`) |
| `VITE_RITCHY_API_BASE_URL`      | -                 | Public API URL (e.g., `http://localhost:3030`)       |
| `VITE_WS_BASE_URL`              | -                 | WebSocket URL (e.g., `http://localhost:3030`)        |
| `VITE_POSTHOG_KEY`              | PostHog dashboard | Analytics API key                                    |
| `VITE_POSTHOG_HOST`             | PostHog dashboard | PostHog host URL                                     |
| `SENTRY_AUTH_TOKEN`             | Sentry dashboard  | Source map upload token                              |


#### HTML Service (`apps/html-service/.env.example`)


| Variable               | Format | Default                 | Description                     |
| ---------------------- | ------ | ----------------------- | ------------------------------- |
| `PORT`                 | number | `3001`                  | Server port                     |
| `MAX_HTML_SIZE_MB`     | number | `10`                    | Maximum HTML input size         |
| `HTML_SERVICE_API_KEY` | string | *required*              | API authentication key          |
| `RUST_LOG`             | string | `info`                  | Rust log level                  |
| `NODE_ENV`             | string | `development`           | Environment                     |
| `LOKI_HOST`            | URL    | `http://localhost:3100` | Loki log aggregation (optional) |


### Secrets Management

- **Local development:** `.env` files (gitignored, never committed)
- **CI/CD:** GitHub Actions secrets (configured in repository settings)
- **Production:** Railway environment variables (per-service configuration)
- **Sensitive keys:** API keys, database passwords, webhook secrets stored as Railway secrets
- **Encryption:** API keys stored AES-256 encrypted in database; only SHA-256 hash used for lookup
- **Template files:** `.env.example` files maintained in git with placeholder values

---

## B.6 -- Technical Walkthrough for Operational Autonomy

### 1. Local Development Setup

#### Prerequisites

```bash
# Required software
Node.js >= 22.1.0    # Use nvm: nvm install 22 && nvm use 22
pnpm >= 9.13.2       # Install: corepack enable && corepack prepare pnpm@9.15.0 --activate
Docker Desktop       # For PostgreSQL, Redis, Qdrant, monitoring stack
Rust 1.83+           # Only if working on html-service: rustup install 1.83
```

#### First-Time Setup

```bash
# 1. Clone the repository
git clone <repo-url> ritchy && cd ritchy

# 2. Install all dependencies
pnpm install

# 3. Start infrastructure services
docker-compose up -d
# Verify: docker-compose ps (all services should be "Up")

# 4. Configure environment variables
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/front/.env.example apps/front/.env

# 5. Fill in required secrets (ask team for values):
#    - Clerk keys (CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY)
#    - Stripe keys (STRIPE_SECRET_KEY, STRIPE_PUBLIC_KEY)
#    - Google API keys
#    - Data provider keys (IcyPeas, Pappers, Forager, etc.)

# 6. Run database migrations
pnpm db:migrate

# 7. Start development servers
pnpm dev
# -> API at http://localhost:3030
# -> Frontend at http://localhost:5173
# -> Storybook at http://localhost:6006
```

#### Verifying Setup

```bash
# Check API health
curl http://localhost:3030/health

# Check frontend
open http://localhost:5173

# Check Grafana dashboards
open http://localhost:3200  # admin/admin

# Check QueueDash (if QUEUE_DASH credentials set)
open http://localhost:3030/queuedash
```

### 2. Daily Development Workflow

#### Branch Workflow

```bash
# Always start from staging
git checkout staging && git pull origin staging

# Create feature branch
git checkout -b feature/RIT-123-description
# Or: fix/RIT-456-bug-description

# Develop, then commit
git add <files>
git commit -m "[front] Add user profile component"
# Commit format: [scope] Description
# Scopes: [core], [front], [back], [types], [docs]

# Push and create PR to staging
git push -u origin feature/RIT-123-description
gh pr create --base staging
# Add --review to title for Claude AI review
```

#### Common Development Commands

```bash
# Start everything
pnpm dev                    # API + Frontend + Storybook

# Code quality (run before committing)
pnpm typecheck              # TypeScript validation
pnpm check                  # Biome linting
pnpm check:fix              # Auto-fix lint issues
pnpm format:fix             # Auto-fix formatting
pnpm coverage               # All checks: typecheck + fix + format

# Database
pnpm db:generate            # Generate migration from schema changes
pnpm db:migrate             # Apply pending migrations

# Testing
pnpm test                   # Run all tests

# Build (verify production build works)
pnpm build                  # Build all packages and apps

# Dependency management
pnpm install                # Install/update dependencies
pnpm add <pkg> --filter api # Add dependency to API only
pnpm add <pkg> --filter front # Add to frontend only
```

#### Working with Stripe Webhooks Locally

```bash
# Terminal 1: Start API server
pnpm dev

# Terminal 2: Forward Stripe webhooks
cd apps/api && pnpm webhook:stripe:dev
# Requires Stripe CLI: brew install stripe/stripe-cli/stripe

# Terminal 3: Forward Clerk webhooks
cd apps/api && pnpm webhook:clerk:dev
# Requires Svix CLI
```

### 3. Debugging Guide

#### API Debugging

**Structured logs (Pino):**

```bash
# Development: pretty-printed in terminal
# Production: JSON format to stdout + Loki

# Adjust log level in apps/api/.env:
LOG_LEVEL=debug  # trace, debug, info, warn, error, fatal
```

**Common API debugging patterns:**

```bash
# Check API health
curl http://localhost:3030/health

# Check metrics endpoint
curl -u metrics:secure_password http://localhost:3030/metrics

# View BullMQ queues
open http://localhost:3030/queuedash

# Check Redis connection
docker exec -it <redis-container> redis-cli -a <password> ping

# Check PostgreSQL
docker exec -it <postgres-container> psql -U postgres -d ritchy -c "SELECT count(*) FROM \"user\";"
```

#### Frontend Debugging

```bash
# TanStack Router DevTools: automatically available in dev mode
# TanStack Query DevTools: available via floating button in dev mode

# Check environment variables (must start with VITE_)
console.log(import.meta.env)

# Check WebSocket connection status
# -> Look for WebSocketContext debug logs in browser console

# Sentry: errors auto-captured in production
# PostHog: analytics events visible in PostHog dashboard
```

#### Database Debugging

```bash
# Connect to local PostgreSQL
docker exec -it <postgres-container> psql -U postgres -d ritchy

# Useful queries:
# Check user count
SELECT count(*) FROM "user";

# Check enrichment status
SELECT "companyStatus", count(*) FROM enrichment GROUP BY "companyStatus";

# Check pending jobs
SELECT queue, status, count(*) FROM (
  -- BullMQ stores jobs in Redis, check via QueueDash
) t GROUP BY queue, status;

# Check recent migrations
SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5;
```

#### Enrichment Debugging

```bash
# 1. Check QueueDash for stuck/failed jobs
open http://localhost:3030/queuedash

# 2. Check enrichment status for a place
curl -H "Authorization: Bearer <token>" \
  http://localhost:3030/web/enrich/status/<enrichment-id>

# 3. Check WebSocket connectivity
# Browser DevTools > Network > WS tab
# Look for /enrichment namespace connection

# 4. Check external service health
# Each provider has its own queue in QueueDash
# Failed jobs show error messages with provider responses
```

### 4. Monitoring & Observability

#### Grafana Dashboards

Access at `http://localhost:3200` (dev) or production Grafana URL.


| Dashboard                | Purpose             | Key Panels                                                |
| ------------------------ | ------------------- | --------------------------------------------------------- |
| **ritchy-overview**      | High-level health   | Error rate, P95 latency, request rate, active enrichments |
| **ritchy-production**    | Detailed operations | 30+ panels across 7 sections                              |
| **ritchy-enrichment**    | Enrichment pipeline | Active by status, duration, error rate per provider       |
| **ritchy-queues**        | BullMQ monitoring   | Active jobs, processed rate, failure rate                 |
| **ritchy-external-apis** | Third-party health  | Request rate, latency, error rate per external API        |


#### Key Metrics to Watch

```
# API Health
http_requests_total{status_code=~"5.."}     # 5xx error count
http_request_duration_seconds{quantile="0.95"}  # P95 latency

# Enrichment Health
enrichment_active{status="processing"}       # Active enrichments
enrichment_errors_total                      # Enrichment failures

# Queue Health
queue_active_jobs                            # Jobs being processed
queue_failed_total                           # Failed jobs

# Infrastructure
nodejs_heap_used_bytes                       # Memory usage
nodejs_eventloop_lag_seconds                 # Event loop lag
```

#### Log Aggregation (Loki)

```bash
# Logs flow: API/HTML Service -> Pino -> pino-loki -> Loki -> Grafana

# In Grafana: Explore > Loki datasource
# Query examples:
{job="ritchy-api"} |= "error"               # All error logs
{job="ritchy-api"} | json | level="error"    # Structured error logs
{job="ritchy-api"} |= "enrichment"           # Enrichment-related logs
```

### 5. Incident Response

#### Service Down: API

```bash
# 1. Check Railway deployment status
railway status

# 2. Check health endpoint
curl https://<api-url>/health

# 3. Check logs in Railway dashboard or Loki

# 4. Common causes:
#    - Database connection exhaustion -> Check PGMAX setting
#    - Redis connection lost -> Check Redis health
#    - Memory leak -> Check Node.js heap metrics in Grafana
#    - Unhandled rejection -> Check Sentry for errors

# 5. Quick fix: Restart service in Railway dashboard
# 6. Rollback: Use Railway's deployment rollback feature
```

#### Service Down: Frontend

```bash
# 1. Check Caddy is serving files
curl -I https://<frontend-url>

# 2. Common causes:
#    - Build failure -> Check Railway build logs
#    - Environment variables missing -> Check VITE_* vars in Railway
#    - API unreachable -> Check API health first

# 3. Quick fix: Trigger redeploy in Railway
```

#### Database Issues

```bash
# 1. Connection issues
#    - Check connection pool (PGMAX/PGMIN)
#    - Check Railway PostgreSQL status

# 2. Slow queries
#    - Check db_query_duration_seconds in Grafana
#    - Look for missing indexes

# 3. Migration failure
#    - Check drizzle migration logs
#    - Never manually modify migration files after they've been applied
#    - If stuck: check drizzle.__drizzle_migrations table
```

#### Enrichment Pipeline Stuck

```bash
# 1. Check QueueDash for failed/stuck jobs
open http://localhost:3030/queuedash

# 2. Check external provider status
#    - Each provider has its own queue
#    - Failed jobs show error messages

# 3. Common issues:
#    - Provider API key expired -> Update in environment variables
#    - Rate limiting -> Check concurrency settings
#    - Provider down -> Waterfall should fallback to next provider
#    - Redis connection lost -> BullMQ jobs will retry on reconnect

# 4. Manual intervention:
#    - Retry failed jobs via QueueDash UI
#    - Adjust concurrency: ENRICHMENT_COMPANY_CONCURRENCY, etc.
```

### 6. Common Troubleshooting Scenarios


| Problem                      | Diagnosis              | Resolution                                                     |
| ---------------------------- | ---------------------- | -------------------------------------------------------------- |
| `pnpm install` fails         | Node version mismatch  | `nvm use 22` or check `.nvmrc`                                 |
| TypeScript errors on build   | Package build order    | Run `pnpm build` (Turborepo handles order)                     |
| Docker services won't start  | Port conflicts         | `docker-compose down -v && docker-compose up -d`               |
| API won't start              | Missing env vars       | Check all required vars in `apps/api/.env`                     |
| Frontend blank page          | API URL misconfigured  | Check `VITE_RITCHY_INTERNAL_BASE_URL`                          |
| WebSocket not connecting     | CORS or URL mismatch   | Check `VITE_WS_BASE_URL` matches API URL                       |
| Migrations fail              | Schema conflict        | `pnpm db:generate` to regenerate, review SQL                   |
| Redis connection refused     | Docker not running     | `docker-compose up -d redis`                                   |
| Enrichment not progressing   | Queue worker stopped   | Check BullMQ logs, restart API                                 |
| Stripe webhooks not arriving | CLI not running        | `cd apps/api && pnpm webhook:stripe:dev`                       |
| Clerk auth fails             | Keys mismatch          | Ensure publishable + secret keys match same Clerk app          |
| Tests fail on CI             | Different Node version | CI uses Node 22.1.0 (check `.github/setup/action.yml`)         |
| Build too slow               | Turbo cache miss       | Check `turbo.json` task configuration, clear with `pnpm clean` |


### 7. Key Contacts & Resources


| Resource               | Location                              |
| ---------------------- | ------------------------------------- |
| **Source Code**        | GitHub repository                     |
| **CI/CD**              | GitHub Actions (`.github/workflows/`) |
| **Hosting**            | Railway dashboard                     |
| **Auth Dashboard**     | Clerk dashboard                       |
| **Payment Dashboard**  | Stripe dashboard                      |
| **Error Tracking**     | Sentry dashboard                      |
| **Analytics**          | PostHog dashboard                     |
| **Monitoring**         | Grafana (self-hosted, port 3200)      |
| **Bug Tracking**       | Linear (project: RIT-*)               |
| **Dependency Updates** | Renovate bot (auto-PRs to staging)    |


---

*End of Technical Handover Document*