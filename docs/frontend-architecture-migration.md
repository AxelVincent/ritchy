# Frontend Architecture Migration Plan

## Overview

This document outlines the migration from the current frontend structure to a cleaner, more maintainable architecture.

### Current Structure
```
src/
├── api/
├── components/
├── contexts/
├── hooks/
├── lib/
├── providers/
├── routes/
├── types/
└── [root files: App.tsx, main.tsx, router.tsx]
```

### Target Structure
```
src/
├── app/
├── components/
│   ├── features/
│   ├── layout/
│   └── ui/
├── lib/
│   ├── api/
│   ├── hooks/
│   ├── types/
│   └── utils/
└── routes/
```

### Goals
- **Simplicity**: 2 main directories (`components/`, `lib/`) + `app/` shell + `routes/`
- **Clear separation**: UI (`components/`) vs logic (`lib/`)
- **Centralized API**: All queries/mutations in `lib/api/` with barrel exports
- **Feature organization**: Business components grouped under `features/`

---

## Phase 1: Create New Structure

Create the new directory structure without moving any files yet.

```bash
# App shell
mkdir -p src/app/providers

# Components
mkdir -p src/components/features
mkdir -p src/components/layout

# Lib
mkdir -p src/lib/api/queries
mkdir -p src/lib/api/mutations
mkdir -p src/lib/hooks
mkdir -p src/lib/types
mkdir -p src/lib/utils
```

---

## Phase 2: Migrate App Shell

Move application entry point and providers to `src/app/`.

### Files to Move

| Current | New |
|---------|-----|
| `src/App.tsx` | `src/app/App.tsx` |
| `src/App.css` | `src/app/App.css` |
| `src/main.tsx` | `src/app/main.tsx` |
| `src/router.tsx` | `src/app/router.tsx` |
| `src/index.css` | `src/app/index.css` |
| `src/providers/query-provider.tsx` | `src/app/providers/query-provider.tsx` |
| `src/providers/theme-provider.tsx` | `src/app/providers/theme-provider.tsx` |

### Update Entry Point

Update `index.html`:
```html
<!-- Before -->
<script type="module" src="/src/main.tsx"></script>

<!-- After -->
<script type="module" src="/src/app/main.tsx"></script>
```

---

## Phase 3: Migrate API Layer

Move all API-related code to `lib/api/`.

### 3.1 Move Query Hooks

| Current | New |
|---------|-----|
| `src/api/queries/users/*` | `src/lib/api/queries/users/*` |
| `src/api/queries/places/*` | `src/lib/api/queries/places/*` |
| `src/api/queries/lists/*` | `src/lib/api/queries/lists/*` |
| `src/api/queries/enrichment/*` | `src/lib/api/queries/enrichment/*` |
| `src/api/queries/enrich/*` | `src/lib/api/queries/enrich/*` |
| `src/api/queries/user-places/*` | `src/lib/api/queries/user-places/*` |
| `src/api/queries/api-keys/*` | `src/lib/api/queries/api-keys/*` |
| `src/api/queries/search/*` | `src/lib/api/queries/search/*` |

### 3.2 Move Mutation Hooks

| Current | New |
|---------|-----|
| `src/api/mutations/contacts/*` | `src/lib/api/mutations/contacts/*` |
| `src/api/mutations/enrichment/*` | `src/lib/api/mutations/enrichment/*` |
| `src/api/mutations/lists/*` | `src/lib/api/mutations/lists/*` |
| `src/api/mutations/places/*` | `src/lib/api/mutations/places/*` |
| `src/api/mutations/payments/*` | `src/lib/api/mutations/payments/*` |
| `src/api/mutations/export/*` | `src/lib/api/mutations/export/*` |
| `src/api/mutations/filters/*` | `src/lib/api/mutations/filters/*` |
| `src/api/mutations/search/*` | `src/lib/api/mutations/search/*` |
| `src/api/mutations/api-keys/*` | `src/lib/api/mutations/api-keys/*` |

### 3.3 Move API Client

| Current | New |
|---------|-----|
| `src/lib/api/createApiClient.ts` | `src/lib/api/client.ts` |
| `src/hooks/useApi.ts` | `src/lib/api/useApi.ts` |

### 3.4 Create Barrel Export

Create `src/lib/api/index.ts`:

```typescript
// Client
export { createApiClient } from './client'
export { useApiQuery, useApiMutation } from './useApi'

// Queries - Users
export * from './queries/users/useUserMe'

// Queries - Places
export * from './queries/places/usePlace'
export * from './queries/places/usePlaceGeocode'
export * from './queries/places/contacts/usePlaceContacts'
export * from './queries/places/enrichment/usePlaceEnrichment'
export * from './queries/places/notes/usePlaceNotes'
export * from './queries/places/reviews/usePlaceReviews'

// Queries - User Places
export * from './queries/user-places/useUserPlaces'
export * from './queries/user-places/useUserPlacePage'
export * from './queries/user-places/useUserPlaceMarkers'
export * from './queries/user-places/useUserPlaceFilterOptions'
export * from './queries/user-places/useFetchItemPage'

// Queries - Lists
export * from './queries/lists/useLists'

// Queries - Enrichment
export * from './queries/enrichment/useEnrichmentStatus'
export * from './queries/enrichment/useActiveEnrichments'
export * from './queries/enrichment/useBatchEnrichmentStatus'
export * from './queries/enrichment/useContactEnrichmentStatus'
export * from './queries/enrichment/useBatchContactEnrichmentStatus'
export * from './queries/enrich/useEnrichmentJobStatus'

// Queries - API Keys
export * from './queries/api-keys/useApiKeys'
export * from './queries/api-keys/useApiKeySecret'
export * from './queries/api-keys/useApiUsage'

// Queries - Search
export * from './queries/search/useSearches'

// Mutations - Contacts
export * from './mutations/contacts/useCreateContact'
export * from './mutations/contacts/useUpdateContact'
export * from './mutations/contacts/useDeleteContact'
export * from './mutations/contacts/usePostContactEmail'
export * from './mutations/contacts/useUpdateContactEmail'
export * from './mutations/contacts/useDeleteContactEmail'
export * from './mutations/contacts/usePostContactPhone'
export * from './mutations/contacts/useUpdateContactPhone'
export * from './mutations/contacts/useDeleteContactPhone'

// Mutations - Enrichment
export * from './mutations/enrichment/useSingleEnrichment'
export * from './mutations/enrichment/useBatchEnrichment'
export * from './mutations/enrichment/useBulkEnrichment'
export * from './mutations/enrichment/useCompanyEnrichment'
export * from './mutations/enrichment/useContactEnrichment'

// Mutations - Lists
export * from './mutations/lists/useUpsertList'
export * from './mutations/lists/useDeleteList'
export * from './mutations/lists/useAddItemsToList'
export * from './mutations/lists/useDeleteItemsFromList'
export * from './mutations/lists/useAddItemFromGeocode'

// Mutations - Places
export * from './mutations/places/autocomplete/usePlaceAutocomplete'
export * from './mutations/places/notes/useAddPlaceNote'
export * from './mutations/places/notes/useUpdatePlaceNote'
export * from './mutations/places/notes/useDeletePlaceNote'
export * from './mutations/places/status/useUpdatePlaceStatus'

// Mutations - Payments
export * from './mutations/payments/useCreateCheckoutSession'
export * from './mutations/payments/useCreatePortalSession'

// Mutations - Export
export * from './mutations/export/useExportUserPlaces'

// Mutations - Filters
export * from './mutations/filters/useGenerateFilters'

// Mutations - Search
export * from './mutations/search/useCreateSearch'

// Mutations - API Keys
export * from './mutations/api-keys/useCreateApiKey'
export * from './mutations/api-keys/useRevokeApiKey'
```

---

## Phase 4: Migrate Hooks

Move shared hooks and contexts to `lib/hooks/`.

### 4.1 Move Contexts (Rename to Hooks)

Contexts are consumed via hooks, so merge them into the hooks directory.

| Current | New |
|---------|-----|
| `src/contexts/WebSocketContext.tsx` | `src/lib/hooks/useWebSocket.tsx` |
| `src/contexts/SelectionContext.tsx` | `src/lib/hooks/useSelection.tsx` |
| `src/contexts/TableSelectionContext.tsx` | `src/lib/hooks/useTableSelection.tsx` |
| `src/contexts/FilterOptionsContext.tsx` | `src/lib/hooks/useFilterOptions.tsx` |
| `src/contexts/EnrichmentMutationContext.tsx` | `src/lib/hooks/useEnrichmentMutation.tsx` |

### 4.2 Move Shared Hooks

| Current | New |
|---------|-----|
| `src/hooks/useDebounce.ts` | `src/lib/hooks/useDebounce.ts` |
| `src/hooks/useDevice.ts` | `src/lib/hooks/useDevice.ts` |
| `src/hooks/useGeolocation.ts` | `src/lib/hooks/useGeolocation.ts` |
| `src/hooks/useIsMobile.ts` | `src/lib/hooks/useIsMobile.ts` |
| `src/hooks/use-mobile.tsx` | `src/lib/hooks/useMobile.tsx` |
| `src/hooks/use-toast.ts` | `src/lib/hooks/useToast.ts` |
| `src/hooks/useMarkerSelection.ts` | `src/lib/hooks/useMarkerSelection.ts` |
| `src/hooks/useTableKeyboardShortcuts.ts` | `src/lib/hooks/useTableKeyboardShortcuts.ts` |
| `src/hooks/useTableSelection.ts` | `src/lib/hooks/useTableSelectionHook.ts` |

### 4.3 Move Feature-Specific Hooks to Features

These hooks belong with their features, not in shared hooks:

| Current | New |
|---------|-----|
| `src/hooks/useBatchEnrichmentWebSocket.ts` | `src/components/features/enrichment/hooks/useBatchEnrichmentWebSocket.ts` |
| `src/hooks/useContactEnrichmentWebSocket.ts` | `src/components/features/enrichment/hooks/useContactEnrichmentWebSocket.ts` |
| `src/hooks/useEnrichmentWebSocket.ts` | `src/components/features/enrichment/hooks/useEnrichmentWebSocket.ts` |
| `src/hooks/useContactMutations.ts` | `src/components/features/contact/hooks/useContactMutations.ts` |

### 4.4 Create Barrel Export

Create `src/lib/hooks/index.ts`:

```typescript
// Device & Responsive
export * from './useDevice'
export * from './useMobile'
export * from './useIsMobile'

// Utilities
export * from './useDebounce'
export * from './useGeolocation'
export * from './useToast'

// Table & Selection
export * from './useMarkerSelection'
export * from './useTableKeyboardShortcuts'
export * from './useTableSelectionHook'

// Contexts (exported as hooks)
export * from './useWebSocket'
export * from './useSelection'
export * from './useTableSelection'
export * from './useFilterOptions'
export * from './useEnrichmentMutation'
```

---

## Phase 5: Migrate Utils

Consolidate utilities into `lib/utils/`.

### 5.1 Move Utility Files

| Current | New |
|---------|-----|
| `src/lib/utils.ts` | `src/lib/utils/cn.ts` |
| `src/lib/utils/phone-utils.ts` | `src/lib/utils/phone.ts` |
| `src/lib/utils/url-utils.ts` | `src/lib/utils/url.ts` |
| `src/lib/utils/country-names.ts` | `src/lib/utils/countries.ts` |
| `src/lib/utils/lru-cache.ts` | `src/lib/utils/lru-cache.ts` |
| `src/lib/utils/debug-logging.ts` | `src/lib/utils/debug.ts` |
| `src/lib/debounce.ts` | `src/lib/utils/debounce.ts` |
| `src/lib/validation.ts` | `src/lib/utils/validation.ts` |
| `src/lib/subscription.ts` | `src/lib/utils/subscription.ts` |
| `src/lib/exportToCsv.ts` | `src/lib/utils/export.ts` |

### 5.2 Merge Formatting Utils

Merge into `src/lib/utils/format.ts`:
- `src/lib/toTitleCase.ts`
- `src/lib/formatUtcOffset.ts`

```typescript
// src/lib/utils/format.ts
export const toTitleCase = (str: string): string => {
  // ... existing implementation
}

export const formatUtcOffset = (offset: number): string => {
  // ... existing implementation
}
```

### 5.3 Move Feature-Specific Utils

| Current | New |
|---------|-----|
| `src/lib/enrichment-steps.ts` | `src/components/features/enrichment/utils/enrichment-steps.ts` |

### 5.4 Create Barrel Export

Create `src/lib/utils/index.ts`:

```typescript
export { cn } from './cn'
export * from './countries'
export * from './debounce'
export * from './debug'
export * from './export'
export * from './format'
export { LRUCache } from './lru-cache'
export * from './phone'
export * from './subscription'
export * from './url'
export * from './validation'
```

---

## Phase 6: Migrate Types

Move type definitions to `lib/types/`.

| Current | New |
|---------|-----|
| `src/types/mapbox-gl-geocoder.d.ts` | `src/lib/types/mapbox-gl-geocoder.d.ts` |
| `src/types/react-table.d.ts` | `src/lib/types/react-table.d.ts` |

---

## Phase 7: Migrate Components

### 7.1 Layout Components

Move shell and structural components to `components/layout/`.

| Current | New |
|---------|-----|
| `src/components/sidebar/*` | `src/components/layout/sidebar/*` |
| `src/components/common/GlobalErrorBoundary.tsx` | `src/components/layout/GlobalErrorBoundary.tsx` |
| `src/components/common/DefaultCatchBoundary.tsx` | `src/components/layout/DefaultCatchBoundary.tsx` |
| `src/components/common/NotFound.tsx` | `src/components/layout/NotFound.tsx` |
| `src/components/common/LoadingSpinner.tsx` | `src/components/layout/LoadingSpinner.tsx` |
| `src/components/common/InstallPrompt.tsx` | `src/components/layout/InstallPrompt.tsx` |

### 7.2 Feature Components

Move business feature components to `components/features/`.

| Current | New |
|---------|-----|
| `src/components/contact/*` | `src/components/features/contact/*` |
| `src/components/data-table/*` | `src/components/features/data-table/*` |
| `src/components/filters/*` | `src/components/features/filters/*` |
| `src/components/enrichment/*` | `src/components/features/enrichment/*` |
| `src/components/import/*` | `src/components/features/import/*` |
| `src/components/lists/*` | `src/components/features/lists/*` |
| `src/components/place-details/*` | `src/components/features/place-details/*` |
| `src/components/map-display/*` | `src/components/features/map/*` |
| `src/components/search/*` | `src/components/features/search/*` |
| `src/components/notes/*` | `src/components/features/notes/*` |
| `src/components/leads/*` | `src/components/features/leads/*` |
| `src/components/payment/*` | `src/components/features/payment/*` |
| `src/components/marketing/*` | `src/components/features/marketing/*` |
| `src/components/status/*` | `src/components/features/status/*` |
| `src/components/api-playground/*` | `src/components/features/api-playground/*` |

### 7.3 Distribute Common Components

Distribute remaining `common/` components appropriately:

**To `components/ui/`** (generic, reusable):
| Current | New |
|---------|-----|
| `src/components/common/ApiErrorDisplay.tsx` | `src/components/ui/api-error-display.tsx` |
| `src/components/common/CalButton.tsx` | `src/components/ui/cal-button.tsx` |
| `src/components/common/DynamicBadgeList.tsx` | `src/components/ui/dynamic-badge-list.tsx` |
| `src/components/common/LoadingMessages.tsx` | `src/components/ui/loading-messages.tsx` |
| `src/components/common/StatusIndicator.tsx` | `src/components/ui/status-indicator.tsx` |
| `src/components/common/TextWrapper.tsx` | `src/components/ui/text-wrapper.tsx` |

**To features** (domain-specific):
| Current | New |
|---------|-----|
| `src/components/common/EmailQualityBadge.tsx` | `src/components/features/contact/EmailQualityBadge.tsx` |
| `src/components/common/OpeningHours.tsx` | `src/components/features/place-details/OpeningHours.tsx` |

### 7.4 UI Components

`src/components/ui/*` stays as-is. No changes needed.

---

## Phase 8: Update Path Aliases

### 8.1 Update tsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@app/*": ["./src/app/*"],
      "@components/*": ["./src/components/*"],
      "@features/*": ["./src/components/features/*"],
      "@lib/*": ["./src/lib/*"],
      "@ui/*": ["./src/components/ui/*"]
    }
  }
}
```

### 8.2 Update vite.config.ts

```typescript
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@app': resolve(__dirname, './src/app'),
      '@components': resolve(__dirname, './src/components'),
      '@features': resolve(__dirname, './src/components/features'),
      '@lib': resolve(__dirname, './src/lib'),
      '@ui': resolve(__dirname, './src/components/ui'),
    },
  },
})
```

---

## Phase 9: Update Imports

Run find-and-replace across the codebase.

### Import Replacements

| Old Pattern | New Pattern |
|-------------|-------------|
| `from '@/api/queries/` | `from '@lib/api/queries/` |
| `from '@/api/mutations/` | `from '@lib/api/mutations/` |
| `from '@/hooks/useApi'` | `from '@lib/api'` |
| `from '@/hooks/` | `from '@lib/hooks/'` |
| `from '@/contexts/` | `from '@lib/hooks/'` |
| `from '@/lib/utils'` | `from '@lib/utils'` |
| `from '@/lib/api/createApiClient'` | `from '@lib/api/client'` |
| `from '@/providers/'` | `from '@app/providers/'` |
| `from '@/components/common/'` | Context-dependent (see Phase 7.3) |
| `from '@/components/sidebar/'` | `from '@components/layout/sidebar/'` |
| `from '@/components/contact/'` | `from '@features/contact/'` |
| `from '@/components/data-table/'` | `from '@features/data-table/'` |
| `from '@/components/filters/'` | `from '@features/filters/'` |
| `from '@/components/enrichment/'` | `from '@features/enrichment/'` |
| `from '@/components/import/'` | `from '@features/import/'` |
| `from '@/components/lists/'` | `from '@features/lists/'` |
| `from '@/components/place-details/'` | `from '@features/place-details/'` |
| `from '@/components/map-display/'` | `from '@features/map/'` |
| `from '@/components/search/'` | `from '@features/search/'` |
| `from '@/components/notes/'` | `from '@features/notes/'` |
| `from '@/components/leads/'` | `from '@features/leads/'` |
| `from '@/components/payment/'` | `from '@features/payment/'` |
| `from '@/components/marketing/'` | `from '@features/marketing/'` |
| `from '@/components/status/'` | `from '@features/status/'` |
| `from '@/components/api-playground/'` | `from '@features/api-playground/'` |

### Simplified API Imports (Optional)

With barrel exports, prefer:
```typescript
// Before
import { useUserMe } from '@/api/queries/users/useUserMe'
import { useCreateContact } from '@/api/mutations/contacts/useCreateContact'

// After
import { useUserMe, useCreateContact } from '@lib/api'
```

---

## Phase 10: Cleanup

### 10.1 Delete Empty/Old Directories

After migration is complete and verified:

```bash
# Old directories
rm -rf src/api
rm -rf src/hooks
rm -rf src/contexts
rm -rf src/providers
rm -rf src/types

# Old component directories
rm -rf src/components/common
rm -rf src/components/contact
rm -rf src/components/data-table
rm -rf src/components/filters
rm -rf src/components/enrichment
rm -rf src/components/import
rm -rf src/components/lists
rm -rf src/components/place-details
rm -rf src/components/map-display
rm -rf src/components/search
rm -rf src/components/notes
rm -rf src/components/leads
rm -rf src/components/payment
rm -rf src/components/marketing
rm -rf src/components/status
rm -rf src/components/api-playground
rm -rf src/components/sidebar

# Empty directories
rm -rf src/components/data-export
rm -rf src/components/integrations

# Old root files (moved to app/)
rm src/App.tsx
rm src/App.css
rm src/main.tsx
rm src/router.tsx
rm src/index.css

# Old lib files (moved to lib/utils/)
rm src/lib/debounce.ts
rm src/lib/toTitleCase.ts
rm src/lib/formatUtcOffset.ts
rm src/lib/exportToCsv.ts
rm src/lib/validation.ts
rm src/lib/subscription.ts
rm src/lib/enrichment-steps.ts
rm src/lib/utils.ts
rm -rf src/lib/utils  # Old nested utils
rm -rf src/lib/api    # Old api folder
```

### 10.2 Verify Build

```bash
pnpm typecheck
pnpm build
pnpm dev  # Manual verification
```

---

## Final Structure

```
src/
├── app/
│   ├── App.tsx
│   ├── App.css
│   ├── main.tsx
│   ├── router.tsx
│   ├── index.css
│   └── providers/
│       ├── query-provider.tsx
│       └── theme-provider.tsx
│
├── components/
│   ├── features/
│   │   ├── api-playground/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── utils/
│   │   │   ├── playground.tsx
│   │   │   └── index.ts
│   │   ├── contact/
│   │   │   ├── hooks/
│   │   │   │   └── useContactMutations.ts
│   │   │   ├── ContactActions.tsx
│   │   │   ├── CreateContactForm.tsx
│   │   │   ├── UnifiedContactCard.tsx
│   │   │   └── ...
│   │   ├── data-table/
│   │   │   ├── columns/
│   │   │   ├── enrich/
│   │   │   ├── DataTable.tsx
│   │   │   └── ...
│   │   ├── enrichment/
│   │   │   ├── hooks/
│   │   │   │   ├── useBatchEnrichmentWebSocket.ts
│   │   │   │   ├── useContactEnrichmentWebSocket.ts
│   │   │   │   └── useEnrichmentWebSocket.ts
│   │   │   ├── utils/
│   │   │   │   └── enrichment-steps.ts
│   │   │   └── ...
│   │   ├── filters/
│   │   ├── import/
│   │   ├── leads/
│   │   ├── lists/
│   │   ├── map/
│   │   ├── marketing/
│   │   ├── notes/
│   │   ├── payment/
│   │   ├── place-details/
│   │   ├── search/
│   │   └── status/
│   │
│   ├── layout/
│   │   ├── sidebar/
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── nav-credits.tsx
│   │   │   ├── nav-custom-lists.tsx
│   │   │   ├── nav-history.tsx
│   │   │   ├── nav-main.tsx
│   │   │   ├── nav-user.tsx
│   │   │   └── ritchy-logo.tsx
│   │   ├── DefaultCatchBoundary.tsx
│   │   ├── GlobalErrorBoundary.tsx
│   │   ├── InstallPrompt.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── NotFound.tsx
│   │
│   └── ui/
│       ├── accordion.tsx
│       ├── alert.tsx
│       ├── api-error-display.tsx
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── cal-button.tsx
│       ├── calendar.tsx
│       ├── card.tsx
│       ├── checkbox.tsx
│       ├── collapsible.tsx
│       ├── command.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── dynamic-badge-list.tsx
│       ├── form.tsx
│       ├── hover-card.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── loading-messages.tsx
│       ├── loading-spinner.tsx
│       ├── popover.tsx
│       ├── progress.tsx
│       ├── radio-group.tsx
│       ├── resizable.tsx
│       ├── scroll-area.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── skeleton.tsx
│       ├── slider.tsx
│       ├── sonner.tsx
│       ├── status-indicator.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       ├── text-wrapper.tsx
│       ├── textarea.tsx
│       ├── toast.tsx
│       ├── toaster.tsx
│       ├── tooltip.tsx
│       └── ... (stories files)
│
├── lib/
│   ├── api/
│   │   ├── client.ts
│   │   ├── useApi.ts
│   │   ├── index.ts
│   │   ├── queries/
│   │   │   ├── api-keys/
│   │   │   │   ├── keys.ts
│   │   │   │   ├── useApiKeys.ts
│   │   │   │   ├── useApiKeySecret.ts
│   │   │   │   └── useApiUsage.ts
│   │   │   ├── enrich/
│   │   │   │   └── useEnrichmentJobStatus.ts
│   │   │   ├── enrichment/
│   │   │   │   ├── useActiveEnrichments.ts
│   │   │   │   ├── useBatchContactEnrichmentStatus.ts
│   │   │   │   ├── useBatchEnrichmentStatus.ts
│   │   │   │   ├── useContactEnrichmentStatus.ts
│   │   │   │   └── useEnrichmentStatus.ts
│   │   │   ├── lists/
│   │   │   │   └── useLists.ts
│   │   │   ├── places/
│   │   │   │   ├── contacts/
│   │   │   │   ├── enrichment/
│   │   │   │   ├── notes/
│   │   │   │   ├── reviews/
│   │   │   │   ├── usePlace.ts
│   │   │   │   └── usePlaceGeocode.ts
│   │   │   ├── search/
│   │   │   │   └── useSearches.ts
│   │   │   ├── user-places/
│   │   │   │   ├── index.ts
│   │   │   │   ├── useFetchItemPage.ts
│   │   │   │   ├── useUserPlaceFilterOptions.ts
│   │   │   │   ├── useUserPlaceMarkers.ts
│   │   │   │   ├── useUserPlacePage.ts
│   │   │   │   └── useUserPlaces.ts
│   │   │   └── users/
│   │   │       └── useUserMe.ts
│   │   └── mutations/
│   │       ├── api-keys/
│   │       ├── contacts/
│   │       ├── enrichment/
│   │       ├── export/
│   │       ├── filters/
│   │       ├── lists/
│   │       ├── payments/
│   │       ├── places/
│   │       └── search/
│   │
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── useDebounce.ts
│   │   ├── useDevice.ts
│   │   ├── useEnrichmentMutation.tsx
│   │   ├── useFilterOptions.tsx
│   │   ├── useGeolocation.ts
│   │   ├── useIsMobile.ts
│   │   ├── useMarkerSelection.ts
│   │   ├── useMobile.tsx
│   │   ├── useSelection.tsx
│   │   ├── useTableKeyboardShortcuts.ts
│   │   ├── useTableSelection.tsx
│   │   ├── useTableSelectionHook.ts
│   │   ├── useToast.ts
│   │   └── useWebSocket.tsx
│   │
│   ├── types/
│   │   ├── mapbox-gl-geocoder.d.ts
│   │   └── react-table.d.ts
│   │
│   └── utils/
│       ├── index.ts
│       ├── cn.ts
│       ├── countries.ts
│       ├── debounce.ts
│       ├── debug.ts
│       ├── export.ts
│       ├── format.ts
│       ├── lru-cache.ts
│       ├── phone.ts
│       ├── subscription.ts
│       ├── url.ts
│       └── validation.ts
│
├── routes/
│   ├── __root.tsx
│   ├── index.tsx
│   ├── _auth.tsx
│   └── _auth/
│       ├── api-playground.tsx
│       ├── checkout.tsx
│       ├── import.tsx
│       ├── leads.tsx
│       ├── pricing.tsx
│       ├── lists/
│       │   └── $listId.tsx
│       └── search/
│           ├── index.tsx
│           └── $searchId.tsx
│
├── assets/
├── test/
│   └── setup.ts
├── routeTree.gen.ts
└── vite-env.d.ts
```

---

## Execution Checklist

Use this checklist to track progress:

- [ ] **Phase 1**: Create new directory structure
- [ ] **Phase 2**: Migrate app shell
  - [ ] Move App.tsx, main.tsx, router.tsx, CSS files
  - [ ] Move providers
  - [ ] Update index.html entry point
- [ ] **Phase 3**: Migrate API layer
  - [ ] Move queries
  - [ ] Move mutations
  - [ ] Move API client and useApi
  - [ ] Create barrel export
- [ ] **Phase 4**: Migrate hooks
  - [ ] Move contexts (rename to hooks)
  - [ ] Move shared hooks
  - [ ] Move feature-specific hooks to features
  - [ ] Create barrel export
- [ ] **Phase 5**: Migrate utils
  - [ ] Move utility files
  - [ ] Merge formatting utils
  - [ ] Move feature-specific utils
  - [ ] Create barrel export
- [ ] **Phase 6**: Migrate types
- [ ] **Phase 7**: Migrate components
  - [ ] Move layout components
  - [ ] Move feature components
  - [ ] Distribute common components
- [ ] **Phase 8**: Update path aliases
  - [ ] Update tsconfig.json
  - [ ] Update vite.config.ts
- [ ] **Phase 9**: Update imports across codebase
- [ ] **Phase 10**: Cleanup
  - [ ] Delete old directories
  - [ ] Verify build
  - [ ] Verify types
  - [ ] Manual testing

---

## Risk Mitigation

### High Risk Areas

1. **Import updates (Phase 9)**: Most files will need import changes
   - Mitigation: Use IDE refactoring tools, run typecheck frequently

2. **Entry point change (Phase 2)**: Breaking if not done correctly
   - Mitigation: Test `pnpm dev` immediately after change

3. **Barrel exports**: Circular dependency risk
   - Mitigation: Keep barrel exports shallow, avoid re-exporting between barrels

### Rollback Strategy

If issues arise:
1. Git revert to pre-migration commit
2. Or: Fix forward (usually faster for import issues)

### Testing Strategy

After each phase:
```bash
pnpm typecheck  # Catch import errors
pnpm build      # Catch bundling issues
pnpm dev        # Manual smoke test
```

---

## Estimated Effort

| Phase | Effort | Notes |
|-------|--------|-------|
| Phase 1 | 5 min | Just mkdir commands |
| Phase 2 | 15 min | Few files, update entry point |
| Phase 3 | 30 min | Many files, create barrel |
| Phase 4 | 20 min | Rename contexts, move hooks |
| Phase 5 | 15 min | Consolidate utils |
| Phase 6 | 5 min | Just 2 type files |
| Phase 7 | 30 min | Most files to move |
| Phase 8 | 10 min | Config updates |
| Phase 9 | 60 min | Bulk import updates |
| Phase 10 | 15 min | Cleanup and verify |

**Total: ~3-4 hours**

---

## Post-Migration

After completing the migration:

1. **Update CLAUDE.md** with new structure documentation
2. **Update onboarding docs** if any exist
3. **Communicate to team** about new import patterns
4. **Consider adding lint rules** to enforce new structure
