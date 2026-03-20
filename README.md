# Ritchy Monorepo

Ritchy is a lead generation and enrichment platform that leverages Google Maps data, website analysis, and multi-provider data enrichment to help users discover and qualify business leads. Built as a TypeScript monorepo with a React frontend, Node.js API, and Rust HTML processing microservice.

## Architecture

```
ritchy/
|-- apps/
|   |-- api/             # Node.js + Express backend (port 3030)
|   |-- front/           # React SPA + Caddy (port 5173 dev, 80 prod)
|   |-- html-service/    # Rust HTML processing microservice (port 3001)
|
|-- packages/
|   |-- logger/          # @ritchy/logger - Structured logging (Pino + Loki)
|   |-- metrics/         # @ritchy/metrics - Prometheus metrics + Express middleware
|   |-- ts-config/       # @ritchy/ts-config - Shared TypeScript configuration
|
|-- docs/                # Documentation
|-- .github/             # CI/CD workflows (lint, typecheck, test, migrate)
```

### Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TanStack Router/Query/Table, Tailwind + Shadcn/UI, Vite, Mapbox GL |
| **Backend** | Node.js, Express, Drizzle ORM, BullMQ, Socket.IO, Zod, LangChain |
| **HTML Service** | Rust |
| **Data** | PostgreSQL 15, Redis 7.2, Qdrant (vector DB) |
| **Auth & Payments** | Clerk, Stripe |
| **Monitoring** | Prometheus, Grafana, Loki, Sentry, PostHog |
| **Build** | Turborepo, pnpm, Biome, TypeScript (strict) |

### Infrastructure Services (Docker Compose)

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL 15 | 5432 | Primary database |
| Redis Stack 7.2 | 6379 | Cache, job queue (BullMQ), pub/sub |
| Qdrant | 6333 | Vector database for semantic search |
| Prometheus | 9090 | Metrics scraping |
| Loki | 3100 | Log aggregation |
| Grafana | 3200 | Dashboards (admin/admin) |
| HTML Service | 3001 | Rust HTML processing |

## Getting Started

### Prerequisites

- Node.js >= 22.1.0 (check `.nvmrc`)
- pnpm >= 9.13.2 (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- Docker and Docker Compose

### Setup

```bash
# Install dependencies
pnpm install

# Start infrastructure services
docker-compose up -d

# Configure environment variables
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/front/.env.example apps/front/.env
# Fill in required secrets (ask a team member for Clerk, Stripe, and provider keys)

# Run database migrations
pnpm db:migrate

# Start development servers
pnpm dev
# API:       http://localhost:3030
# Frontend:  http://localhost:5173
# Grafana:   http://localhost:3200
```

## Development Commands

```bash
# Development
pnpm dev                 # Start all apps in dev mode
pnpm build               # Build all packages and apps

# Code quality
pnpm typecheck           # TypeScript validation
pnpm check               # Biome linting
pnpm check:fix           # Auto-fix lint issues
pnpm format:fix          # Auto-fix formatting
pnpm coverage            # All checks: typecheck + fix + format

# Database
pnpm db:generate         # Generate migration from schema changes
pnpm db:migrate          # Apply pending migrations

# Testing
pnpm test                # Run all tests

# Cleanup
pnpm clean               # Clean all build artifacts
```

## Development Workflow

### Branch Management

Create branches from `staging` using the Linear ticket ID:

```bash
git checkout staging && git pull origin staging
git checkout -b feature/RIT-123-description
# or: fix/RIT-456-bug-description
```

### Commit Convention

Format: `[scope] Description`

- `[core]` - Shared/infrastructure changes
- `[front]` - Frontend changes
- `[back]` - Backend changes
- `[types]` - Shared type changes
- `[docs]` - Documentation

### Pull Request Process

1. Create PR from feature branch to `staging`
2. CI runs automatically: lint, typecheck, test, migrate
3. Add `--review` to PR title for Claude AI code review
4. Two engineer approvals required
5. Merge to `staging` -> auto-deploys to staging environment
6. Merge `staging` to `master` -> auto-deploys to production

## Code Standards

### Naming Conventions

- **PascalCase**: Components, Types, Interfaces
- **camelCase**: Functions, Variables, Properties
- **kebab-case**: Files, Folders
- **SCREAMING_SNAKE_CASE**: Constants

### Core Principles

- **Functional programming**: No classes, pure functions, arrow function syntax, named exports only
- **Type safety**: Strict TypeScript, Zod validation, no `any` types
- **Single responsibility**: Each function/component has one clear purpose
- **Feature organization**: Self-contained features with clear boundaries

```typescript
// Function style
export const getUserData = async (id: string): Promise<User> => {
  if (!id) throw new Error('ID required')
  return await fetchUser(id)
}

// Component style
export const UserProfile = ({ id }: { id: string }) => {
  const { data } = useQuery(['user', id], () => getUser(id))
  return data ? <div>{data.name}</div> : null
}
```

## Documentation

| Document | Location |
|----------|----------|
| Technical Handover | `docs/TECHNICAL_HANDOVER.md` |
| API README | `apps/api/README.md` |
| Frontend README | `apps/front/README.md` |
| HTML Service README | `apps/html-service/README.md` |
| Metrics Guide | `packages/metrics/README.md` |
| WebSocket Guide | `apps/api/src/websocket/README.md` |
| Query/Mutation Guide | `apps/front/src/api/README.md` |
