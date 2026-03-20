# Ritchy Frontend

React single-page application for the Ritchy lead generation and enrichment platform.

## Technology Stack

| Category | Technologies |
|----------|-------------|
| **Framework** | React 18, TypeScript 5.7 |
| **Build** | Vite 5.4, Biome |
| **Routing** | TanStack Router (file-based, type-safe) |
| **Data Fetching** | TanStack Query (staleTime: 5min, gcTime: 2h) |
| **Tables** | TanStack Table + TanStack Virtual |
| **Forms** | React Hook Form, TanStack Form, Zod validation |
| **Styling** | Tailwind CSS 3.4 + Shadcn/UI (Radix primitives) |
| **State** | TanStack Query (server), Zustand (client), URL params (filters/pagination) |
| **Auth** | Clerk (`@clerk/clerk-react`) |
| **Payments** | Stripe.js + React Stripe |
| **Maps** | Mapbox GL JS |
| **Real-time** | Socket.IO client (WebSocket-first, HTTP polling fallback) |
| **Analytics** | PostHog, Sentry |
| **Storybook** | Storybook 9 for component development |

## Project Structure

```
src/
|-- routes/                    # File-based routing (TanStack Router)
|   |-- __root.tsx             # Root layout
|   |-- _auth.tsx              # Protected layout (Clerk auth guard)
|   |-- index.tsx              # Public login page (/)
|   |-- _auth/
|       |-- search/            # Search interface with map
|       |-- leads.tsx           # Leads table with filters
|       |-- lists/              # List management
|       |-- api-keys.tsx        # API key management
|       |-- api-playground.tsx  # API testing tool
|       |-- import.tsx          # CSV import
|       |-- pricing.tsx         # Pricing page
|       |-- checkout.tsx        # Stripe checkout
|
|-- api/                       # Data layer
|   |-- queries/               # TanStack Query read operations (by domain)
|   |-- mutations/             # TanStack Query write operations (by domain)
|
|-- components/
|   |-- ui/                    # Shadcn/UI primitives (Button, Card, Dialog, etc.)
|   |-- data-table/            # Advanced table with virtual scrolling
|   |-- filters/               # Dynamic filter system (URL-synced)
|   |-- search/                # Search interface
|   |-- enrichment/            # Enrichment status display
|   |-- contact/               # Contact management
|   |-- company-display/       # Company detail sections
|   |-- map-display/           # Mapbox integration
|   |-- sidebar/               # Navigation sidebar
|   |-- payment/               # Stripe integration
|   |-- import/                # CSV import
|   |-- lists/                 # List management
|   |-- api-keys/              # API key UI
|   |-- api-playground/        # API testing
|
|-- contexts/                  # React Context providers
|   |-- WebSocketContext.tsx    # Real-time enrichment subscriptions
|   |-- FilterOptionsContext.tsx
|   |-- SelectionContext.tsx
|   |-- TableSelectionContext.tsx
|   |-- EnrichmentMutationContext.tsx
|
|-- hooks/
|   |-- useApi.ts              # Core API hooks (useApiQuery, useApiMutation)
|
|-- providers/
|   |-- query-provider.tsx     # TanStack Query config
|   |-- theme-provider.tsx     # Dark/light mode
|
|-- lib/
|   |-- api/createApiClient.ts # HTTP client with auth injection
|   |-- utils/                 # Utility functions (cn, formatters)
|   |-- validation.ts          # Zod schemas
```

## Routes

| Path | Auth | Description |
|------|------|-------------|
| `/` | Public | Clerk sign-in page |
| `/search` | Protected | Search interface with Mapbox map and keyword/location search |
| `/leads` | Protected | Leads data table with advanced filtering, sorting, pagination |
| `/lists/:listId` | Protected | List detail (redirects to leads with list filter) |
| `/api-keys` | Protected | API key creation, revocation, usage analytics |
| `/api-playground` | Protected | Interactive API testing tool |
| `/import` | Protected | CSV import with column mapping (max 1000 rows) |
| `/pricing` | Protected | Subscription pricing page |
| `/checkout` | Protected | Stripe checkout flow |

## Key Patterns

### API Client

Two API clients configured in `src/hooks/useApi.ts`:
- **Internal API**: `VITE_RITCHY_INTERNAL_BASE_URL` - Clerk-authenticated web routes
- **Public API**: `VITE_RITCHY_API_BASE_URL/api` - API key-authenticated routes

```typescript
// Query (read)
const { data } = useApiQuery<ResponseType>('/users/me', userKeys.me())

// Mutation (write)
const mutation = useApiMutation<Response, Variables>('/contacts', {
  method: 'POST',
  onSuccess: () => queryClient.invalidateQueries({ queryKey: contactKeys.all })
})
```

### Real-Time Updates (Enrichment)

WebSocket-first architecture with HTTP polling fallback:

```typescript
// WebSocket subscription (primary - instant updates)
const { isConnected } = useEnrichmentWebSocket(enrichmentId)

// HTTP polling (fallback - only when WebSocket is disconnected)
useApiQuery('/enrich/status/:id', key, {
  enabled: !isConnected,
  refetchInterval: 2000 + Math.random() * 1000  // jitter
})
```

### URL-Synced State

Filters, pagination, and sorting are persisted in URL search params via TanStack Router:

```typescript
const { rules, apiFilters, pagination } = useFilterState({
  search: Route.useSearch(),
  navigate: useNavigate()
})
```

### Provider Stack

Application providers are layered in `App.tsx`:

```
GlobalErrorBoundary
  -> ClerkProvider (auth)
    -> QueryProvider (TanStack Query)
      -> ThemeProvider (dark/light)
        -> WebSocketProvider (real-time)
          -> RouterProvider (TanStack Router)
```

## Environment Variables

All frontend env vars must be prefixed with `VITE_` to be exposed to the browser.

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk authentication |
| `VITE_RITCHY_INTERNAL_BASE_URL` | Yes | Internal API URL (e.g., `http://localhost:3030/web`) |
| `VITE_RITCHY_API_BASE_URL` | Yes | Public API URL (e.g., `http://localhost:3030`) |
| `VITE_WS_BASE_URL` | Yes | WebSocket URL (e.g., `http://localhost:3030`) |
| `VITE_MAPBOX_ACCESS_TOKEN` | Yes | Mapbox map rendering |
| `VITE_STRIPE_PUBLIC_KEY` | Yes | Stripe checkout |
| `VITE_POSTHOG_KEY` | No | PostHog analytics |
| `VITE_POSTHOG_HOST` | No | PostHog host URL |
| `SENTRY_AUTH_TOKEN` | No | Sentry source map uploads |

See `.env.example` for local development defaults.

## Development

```bash
# Start dev server (Vite + Storybook)
pnpm dev

# Build for production
pnpm build

# Type checking
pnpm typecheck

# Linting and formatting
pnpm check:fix
pnpm format:fix

# Tests
pnpm test
pnpm test:ui          # Vitest UI
pnpm test:coverage    # Coverage report

# Storybook
pnpm storybook        # Dev server at http://localhost:6006
pnpm build-storybook  # Static build
```

## Build Configuration

Vite config (`vite.config.ts`) includes:
- **React Fast Refresh** via `@vitejs/plugin-react`
- **TanStack Router Vite plugin** for auto-generated route tree
- **Sentry plugin** for source map uploads
- **Path aliases**: `@/` -> `src/`, `@api/` -> `../../apps/api/src/`
- **Manual chunks**: React vendor bundle for caching
- **Optimized deps**: Pre-bundled heavy dependencies (TanStack, Mapbox, Socket.IO)
