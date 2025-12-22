# Frontend Multi-Worker Architecture - Implementation Plan

## Overview

This document outlines the frontend changes needed to support the new multi-worker enrichment architecture with separate company and officer enrichment.

### Backend Changes (Already Implemented)

| Endpoint | Method | Purpose | Credits |
|----------|--------|---------|---------|
| `/enrich/company` | POST | Enqueue company enrichment | 1 |
| `/enrich/officer` | POST | Enqueue officer enrichment | 5 |
| `/enrich/company/status/:userPlaceId` | GET | Get company status | - |
| `/enrich/officer/status/:officerId` | GET | Get officer status | - |
| `/enrich/officer/status?officerIds=...` | GET | Batch officer status | - |

### Credit Model

| Action | Credits |
|--------|---------|
| Company Enrichment | 1 credit |
| Officer Enrichment | 5 credits per officer |

---

## Phase 1: API Layer

### 1.1 Create Company Enrichment Mutation

**File**: `apps/front/src/api/mutations/enrichment/useCompanyEnrichment.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../client'
import { activeEnrichmentsKeys, userPlacesKeys } from '../../queryKeys'

interface CompanyEnrichmentParams {
  userPlaceId: string
}

interface CompanyEnrichmentResponse {
  success: boolean
  message: string
  enrichmentId?: string
  alreadyEnriched?: boolean
  credits: number
}

export const useCompanyEnrichment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userPlaceId }: CompanyEnrichmentParams) => {
      const response = await apiClient.post<CompanyEnrichmentResponse>(
        '/enrich/company',
        { userPlaceId }
      )
      return response.data
    },
    onMutate: async ({ userPlaceId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userPlacesKeys.all })

      // Add to active enrichments
      queryClient.setQueryData<string[]>(
        activeEnrichmentsKeys.all,
        (old = []) => [...new Set([...old, userPlaceId])]
      )
    },
    onSuccess: (data, { userPlaceId }) => {
      // Invalidate credits query
      queryClient.invalidateQueries({ queryKey: ['userCredits'] })
    },
    onError: (error, { userPlaceId }) => {
      // Remove from active enrichments on error
      queryClient.setQueryData<string[]>(
        activeEnrichmentsKeys.all,
        (old = []) => old.filter(id => id !== userPlaceId)
      )
    },
  })
}
```

### 1.2 Create Officer Enrichment Mutation

**File**: `apps/front/src/api/mutations/enrichment/useOfficerEnrichment.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../client'
import { officerEnrichmentKeys, placeContactsKeys } from '../../queryKeys'

interface OfficerEnrichmentParams {
  officerId: string
}

interface OfficerEnrichmentResponse {
  success: boolean
  message: string
  officerId?: string
  alreadyEnriched?: boolean
  credits: number
}

export const useOfficerEnrichment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ officerId }: OfficerEnrichmentParams) => {
      const response = await apiClient.post<OfficerEnrichmentResponse>(
        '/enrich/officer',
        { officerId }
      )
      return response.data
    },
    onMutate: async ({ officerId }) => {
      // Optimistically update officer status to 'queued'
      queryClient.setQueryData(
        officerEnrichmentKeys.single(officerId),
        { status: 'queued', progress: 0, step: 'Waiting to start', updatedAt: Date.now() }
      )
    },
    onSuccess: (data) => {
      // Invalidate credits query
      queryClient.invalidateQueries({ queryKey: ['userCredits'] })
    },
    onError: (error, { officerId }) => {
      // Reset officer status on error
      queryClient.setQueryData(
        officerEnrichmentKeys.single(officerId),
        { status: 'idle', progress: 0, step: '', updatedAt: Date.now() }
      )
    },
  })
}
```

### 1.3 Create Officer Status Query

**File**: `apps/front/src/api/queries/enrichment/useOfficerEnrichmentStatus.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../client'
import type { EnrichmentStatusResponse } from '@ritchy/types'

export const officerEnrichmentKeys = {
  all: ['officer-enrichment-status'] as const,
  single: (officerId: string) => [...officerEnrichmentKeys.all, officerId] as const,
  batch: (officerIds: string[]) => [...officerEnrichmentKeys.all, 'batch', ...officerIds.sort()] as const,
}

export const useOfficerEnrichmentStatus = (officerId: string, enabled = true) => {
  return useQuery({
    queryKey: officerEnrichmentKeys.single(officerId),
    queryFn: async () => {
      const response = await apiClient.get<EnrichmentStatusResponse>(
        `/enrich/officer/status/${officerId}`
      )
      return response.data
    },
    enabled,
    staleTime: 30_000, // 30 seconds
    refetchInterval: (query) => {
      const status = query.state.data?.status
      // Only poll if processing or queued
      if (status === 'processing' || status === 'queued') {
        return 2000 + Math.random() * 1000 // 2-3s with jitter
      }
      return false
    },
  })
}
```

### 1.4 Create Batch Officer Status Query

**File**: `apps/front/src/api/queries/enrichment/useBatchOfficerEnrichmentStatus.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../client'
import type { EnrichmentStatusResponse } from '@ritchy/types'
import { officerEnrichmentKeys } from './useOfficerEnrichmentStatus'

type BatchOfficerStatusResponse = Record<string, EnrichmentStatusResponse>

export const useBatchOfficerEnrichmentStatus = (
  officerIds: string[],
  enabled = true
) => {
  const sortedIds = [...officerIds].sort()

  return useQuery({
    queryKey: officerEnrichmentKeys.batch(sortedIds),
    queryFn: async () => {
      if (sortedIds.length === 0) return {}

      const params = new URLSearchParams()
      sortedIds.forEach(id => params.append('officerIds', id))

      const response = await apiClient.get<BatchOfficerStatusResponse>(
        `/enrich/officer/status?${params.toString()}`
      )
      return response.data
    },
    enabled: enabled && sortedIds.length > 0,
    staleTime: 30_000,
    gcTime: 60_000,
  })
}
```

### 1.5 Update Query Keys Export

**File**: `apps/front/src/api/queryKeys.ts` (update)

```typescript
// Add to existing exports
export const officerEnrichmentKeys = {
  all: ['officer-enrichment-status'] as const,
  single: (officerId: string) => [...officerEnrichmentKeys.all, officerId] as const,
  batch: (officerIds: string[]) => [...officerEnrichmentKeys.all, 'batch', ...officerIds.sort()] as const,
}

export const companyEnrichmentKeys = {
  all: ['company-enrichment-status'] as const,
  single: (userPlaceId: string) => [...companyEnrichmentKeys.all, userPlaceId] as const,
}
```

---

## Phase 2: WebSocket Updates

### 2.1 Add Officer WebSocket Subscription

**File**: `apps/front/src/hooks/useOfficerEnrichmentWebSocket.ts`

```typescript
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWebSocket } from '../contexts/WebSocketContext'
import type { EnrichmentStatusResponse } from '@ritchy/types'
import { officerEnrichmentKeys, placeContactsKeys } from '../api/queryKeys'

interface OfficerStatusUpdate {
  officerId: string
  status: 'idle' | 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  step: string
  error?: string
  updatedAt: number
}

export const useOfficerEnrichmentWebSocket = (
  officerId: string | null,
  enabled = true
) => {
  const sourceKey = useId()
  const { socket, isConnected } = useWebSocket()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<EnrichmentStatusResponse | null>(null)

  // Subscribe to officer status updates
  useEffect(() => {
    if (!socket || !isConnected || !officerId || !enabled) return

    // Subscribe to officer enrichment status
    socket.emit('officer-subscribe', { officerId, sourceKey })

    const handleStatusUpdate = (data: OfficerStatusUpdate) => {
      if (data.officerId !== officerId) return

      const statusData: EnrichmentStatusResponse = {
        status: data.status,
        progress: data.progress,
        step: data.step,
        error: data.error,
        updatedAt: data.updatedAt,
      }

      setStatus(statusData)

      // Update query cache
      queryClient.setQueryData(
        officerEnrichmentKeys.single(officerId),
        statusData
      )

      // On completion, invalidate contacts query
      if (data.status === 'completed') {
        queryClient.invalidateQueries({ queryKey: placeContactsKeys.all })
        queryClient.invalidateQueries({ queryKey: ['userCredits'] })
      }
    }

    socket.on('officer-status-update', handleStatusUpdate)

    return () => {
      socket.emit('officer-unsubscribe', { officerId, sourceKey })
      socket.off('officer-status-update', handleStatusUpdate)
    }
  }, [socket, isConnected, officerId, enabled, sourceKey, queryClient])

  return { status, isConnected }
}
```

### 2.2 Update WebSocket Context (Backend WebSocket Handler)

The backend WebSocket handler needs to be updated to support officer-specific events. This is a backend change but noting here for completeness:

- New events: `officer-subscribe`, `officer-unsubscribe`, `officer-status-update`
- Namespace: Still `/enrichment` or new `/officer-enrichment`

---

## Phase 3: UI Components

### 3.1 Create Officer Enrichment Button

**File**: `apps/front/src/components/contact/OfficerEnrichButton.tsx`

```typescript
import { memo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { useOfficerEnrichment } from '@/api/mutations/enrichment/useOfficerEnrichment'
import { useOfficerEnrichmentStatus } from '@/api/queries/enrichment/useOfficerEnrichmentStatus'
import { useOfficerEnrichmentWebSocket } from '@/hooks/useOfficerEnrichmentWebSocket'
import { cn } from '@/lib/utils'

interface OfficerEnrichButtonProps {
  officerId: string
  companyEnriched: boolean
  disabled?: boolean
  className?: string
}

const OFFICER_CREDITS = 5

export const OfficerEnrichButton = memo(function OfficerEnrichButton({
  officerId,
  companyEnriched,
  disabled = false,
  className,
}: OfficerEnrichButtonProps) {
  const { mutate: enrichOfficer, isPending } = useOfficerEnrichment()

  // WebSocket for real-time updates
  const { status: wsStatus } = useOfficerEnrichmentWebSocket(officerId)

  // Fallback query (only polls when WS disconnected or processing)
  const { data: queryStatus } = useOfficerEnrichmentStatus(officerId, !wsStatus)

  const status = wsStatus || queryStatus

  const handleEnrich = useCallback(() => {
    enrichOfficer({ officerId })
  }, [enrichOfficer, officerId])

  // Company must be enriched first
  if (!companyEnriched) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className={cn('gap-2', className)}
        title="Company enrichment must complete first"
      >
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Waiting for company</span>
      </Button>
    )
  }

  // Already enriched
  if (status?.status === 'completed') {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className={cn('gap-2', className)}
      >
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <span className="text-green-600">Enriched</span>
      </Button>
    )
  }

  // Failed
  if (status?.status === 'failed') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleEnrich}
        disabled={disabled || isPending}
        className={cn('gap-2', className)}
      >
        <XCircle className="h-4 w-4 text-red-500" />
        <span className="text-red-600">Retry</span>
      </Button>
    )
  }

  // Processing or queued
  if (status?.status === 'processing' || status?.status === 'queued') {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className={cn('gap-2', className)}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>
          {status.status === 'queued' ? 'Queued' : `${status.progress}%`}
        </span>
      </Button>
    )
  }

  // Idle - ready to enrich
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleEnrich}
      disabled={disabled || isPending}
      className={cn('gap-2', className)}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      <span>Enrich ({OFFICER_CREDITS} credits)</span>
    </Button>
  )
})
```

### 3.2 Create Officer Status Badge

**File**: `apps/front/src/components/contact/OfficerStatusBadge.tsx`

```typescript
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle, Clock, CircleDashed } from 'lucide-react'
import type { EnrichmentStatusResponse } from '@ritchy/types'
import { cn } from '@/lib/utils'

interface OfficerStatusBadgeProps {
  status: EnrichmentStatusResponse | null | undefined
  showProgress?: boolean
  className?: string
}

const statusConfig = {
  idle: {
    icon: CircleDashed,
    label: 'Not enriched',
    variant: 'secondary' as const,
    iconClass: 'text-muted-foreground',
  },
  queued: {
    icon: Clock,
    label: 'Queued',
    variant: 'outline' as const,
    iconClass: 'text-yellow-500',
  },
  processing: {
    icon: Loader2,
    label: 'Enriching',
    variant: 'outline' as const,
    iconClass: 'text-blue-500 animate-spin',
  },
  completed: {
    icon: CheckCircle2,
    label: 'Enriched',
    variant: 'default' as const,
    iconClass: 'text-green-500',
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    variant: 'destructive' as const,
    iconClass: 'text-red-500',
  },
}

export const OfficerStatusBadge = ({
  status,
  showProgress = true,
  className,
}: OfficerStatusBadgeProps) => {
  const statusKey = status?.status || 'idle'
  const config = statusConfig[statusKey]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={cn('gap-1', className)}>
      <Icon className={cn('h-3 w-3', config.iconClass)} />
      <span>
        {config.label}
        {showProgress && statusKey === 'processing' && status?.progress
          ? ` ${status.progress}%`
          : ''}
      </span>
    </Badge>
  )
}
```

### 3.3 Update UnifiedContactCard

**File**: `apps/front/src/components/contact/UnifiedContactCard.tsx` (update)

Add officer enrichment button to the existing contact card:

```typescript
// Add to imports
import { OfficerEnrichButton } from './OfficerEnrichButton'
import { OfficerStatusBadge } from './OfficerStatusBadge'
import { useOfficerEnrichmentStatus } from '@/api/queries/enrichment/useOfficerEnrichmentStatus'

// In the component, add officer enrichment section
interface UnifiedContactCardProps {
  contact: PlaceContact
  officerId?: string  // Add officerId prop
  companyEnriched?: boolean  // Add company enrichment status
  // ... existing props
}

// Inside the card header or actions area, add:
{officerId && (
  <div className="flex items-center gap-2">
    <OfficerStatusBadge status={officerStatus} />
    {officerStatus?.status !== 'completed' && (
      <OfficerEnrichButton
        officerId={officerId}
        companyEnriched={companyEnriched ?? false}
      />
    )}
  </div>
)}
```

### 3.4 Update PlaceContactTab

**File**: `apps/front/src/components/place-details/tabs/PlaceContactTab.tsx` (update)

Add officer enrichment UI to the contacts tab:

```typescript
// Add to imports
import { OfficerEnrichButton } from '@/components/contact/OfficerEnrichButton'
import { usePlaceEnrichmentQuery } from '@/api/queries/places/enrichment/usePlaceEnrichment'

// In the component
const { data: enrichmentData } = usePlaceEnrichmentQuery(place.id)
const companyEnriched = enrichmentData?.companyStatus === 'completed'

// In the contact list rendering, pass officer info:
{contacts.map((contact) => (
  <UnifiedContactCard
    key={contact.id}
    contact={contact}
    officerId={contact.officerId}
    companyEnriched={companyEnriched}
    // ... other props
  />
))}
```

---

## Phase 4: Enrichment Flow Updates

### 4.1 Update EnrichmentActionButton for Two-Phase Flow

**File**: `apps/front/src/components/data-table/enrich/EnrichmentActionButton.tsx` (update)

The current button triggers bulk enrichment. We need to update it to:
1. First trigger company enrichment (1 credit)
2. Show option to enrich officers separately

```typescript
// Add new UI state for two-phase enrichment
// Option A: Keep single button, company-only enrichment
// Option B: Show dropdown with "Enrich Company" and "Enrich All Officers"

// Recommended: Option A for table view, detailed options in place details
```

### 4.2 Create Enrichment Cost Summary Component

**File**: `apps/front/src/components/enrichment/EnrichmentCostSummary.tsx`

```typescript
interface EnrichmentCostSummaryProps {
  companyCredits: number
  officerCount: number
  officerCredits: number
}

export const EnrichmentCostSummary = ({
  companyCredits,
  officerCount,
  officerCredits,
}: EnrichmentCostSummaryProps) => {
  const totalOfficerCredits = officerCount * officerCredits
  const totalCredits = companyCredits + totalOfficerCredits

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>Company enrichment</span>
        <span>{companyCredits} credit</span>
      </div>
      {officerCount > 0 && (
        <div className="flex justify-between">
          <span>Officer enrichment ({officerCount} officers × {officerCredits})</span>
          <span>{totalOfficerCredits} credits</span>
        </div>
      )}
      <div className="flex justify-between font-medium border-t pt-2">
        <span>Total</span>
        <span>{totalCredits} credits</span>
      </div>
    </div>
  )
}
```

---

## Phase 5: Constants & Types Updates

### 5.1 Update Credit Constants

**File**: `apps/front/src/components/data-table/enrich/constants.ts` (update)

```typescript
// Update existing constant
export const CREDIT_COST_PER_ENRICHMENT = 5 // Legacy - full enrichment

// Add new constants
export const COMPANY_ENRICHMENT_CREDITS = 1
export const OFFICER_ENRICHMENT_CREDITS = 5
```

### 5.2 Add Types

**File**: `packages/types/src/enrichment.ts` (update if needed)

```typescript
// Ensure these types exist
export interface CompanyEnrichmentResponse {
  success: boolean
  message: string
  enrichmentId?: string
  alreadyEnriched?: boolean
  credits: number
}

export interface OfficerEnrichmentResponse {
  success: boolean
  message: string
  officerId?: string
  alreadyEnriched?: boolean
  credits: number
}

// Officer with enrichment status
export interface OfficerWithEnrichment {
  id: string
  firstName?: string
  lastName?: string
  role?: string
  enrichmentStatus: 'idle' | 'queued' | 'processing' | 'completed' | 'failed'
  enrichedAt?: Date
}
```

---

## Phase 6: Backend WebSocket Updates (Backend)

### 6.1 Add Officer Status Events

The backend WebSocket handler needs to emit officer-specific events:

```typescript
// In status_manager.ts or websocket handler
export const emitOfficerStatusUpdate = (
  officerId: string,
  status: EnrichmentStatusResponse
) => {
  io.to(`officer:${officerId}`).emit('officer-status-update', {
    officerId,
    ...status,
  })
}
```

---

## Implementation Order

### Phase 1: API Layer (Priority: High)
1. ✅ Create `useCompanyEnrichment` mutation
2. ✅ Create `useOfficerEnrichment` mutation
3. ✅ Create `useOfficerEnrichmentStatus` query
4. ✅ Create `useBatchOfficerEnrichmentStatus` query
5. ✅ Update query keys export

### Phase 2: WebSocket (Priority: Medium)
1. ⬜ Create `useOfficerEnrichmentWebSocket` hook
2. ⬜ Update backend WebSocket handler for officer events

### Phase 3: UI Components (Priority: High)
1. ⬜ Create `OfficerEnrichButton` component
2. ⬜ Create `OfficerStatusBadge` component
3. ⬜ Update `UnifiedContactCard` with officer enrichment
4. ⬜ Update `PlaceContactTab` to show enrichment options

### Phase 4: Flow Updates (Priority: Medium)
1. ⬜ Update `EnrichmentActionButton` for company-only option
2. ⬜ Create `EnrichmentCostSummary` component
3. ⬜ Update confirmation dialogs with new pricing

### Phase 5: Constants & Types (Priority: Low)
1. ⬜ Update credit constants
2. ⬜ Add/update types in `@ritchy/types`

### Phase 6: Backend WebSocket (Priority: Medium)
1. ⬜ Add officer WebSocket room management
2. ⬜ Emit officer status events

---

## Files Summary

### New Files to Create (8 files)

| File | Description |
|------|-------------|
| `apps/front/src/api/mutations/enrichment/useCompanyEnrichment.ts` | Company enrichment mutation |
| `apps/front/src/api/mutations/enrichment/useOfficerEnrichment.ts` | Officer enrichment mutation |
| `apps/front/src/api/queries/enrichment/useOfficerEnrichmentStatus.ts` | Single officer status query |
| `apps/front/src/api/queries/enrichment/useBatchOfficerEnrichmentStatus.ts` | Batch officer status query |
| `apps/front/src/hooks/useOfficerEnrichmentWebSocket.ts` | Officer WebSocket hook |
| `apps/front/src/components/contact/OfficerEnrichButton.tsx` | Officer enrich button |
| `apps/front/src/components/contact/OfficerStatusBadge.tsx` | Officer status badge |
| `apps/front/src/components/enrichment/EnrichmentCostSummary.tsx` | Cost breakdown component |

### Files to Modify (5+ files)

| File | Changes |
|------|---------|
| `apps/front/src/api/queryKeys.ts` | Add officer enrichment keys |
| `apps/front/src/components/contact/UnifiedContactCard.tsx` | Add officer enrichment UI |
| `apps/front/src/components/place-details/tabs/PlaceContactTab.tsx` | Add officer enrichment options |
| `apps/front/src/components/data-table/enrich/constants.ts` | Add new credit constants |
| `apps/front/src/components/data-table/enrich/EnrichmentActionButton.tsx` | Optional: company-only mode |

---

## Migration Strategy

### Backward Compatibility

The legacy `/enrich/bulk` endpoint still exists and uses the old `enrichment-unit` worker. This means:

1. **Existing UI works unchanged** - The current enrichment flow continues to work
2. **Gradual rollout** - New officer-level enrichment can be added incrementally
3. **Feature flag option** - Can gate new UI behind a feature flag

### Recommended Rollout

1. **Phase 1**: Deploy backend (already done)
2. **Phase 2**: Add new mutations/queries (no UI changes)
3. **Phase 3**: Add officer enrichment to contact cards
4. **Phase 4**: Update bulk enrichment UI with cost breakdown
5. **Phase 5**: Remove legacy enrichment-unit worker (future)

---

## Testing Checklist

- [ ] Company enrichment triggers correctly
- [ ] Officer enrichment blocked until company complete
- [ ] Credit deduction works for both types
- [ ] WebSocket updates show real-time progress
- [ ] Polling fallback works when WS disconnected
- [ ] Error states display correctly
- [ ] Already-enriched items show correct state
- [ ] Batch officer status query works
- [ ] Cost summary shows correct totals
