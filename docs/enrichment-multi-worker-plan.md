# Enrichment Multi-Worker Architecture - Implementation Plan

## Overview

This document outlines the migration from a monolithic enrichment system to a 2-worker architecture with separate billing for company and contact enrichment.

### Scope

**In scope (this PR):**
- Separate company enrichment from contact enrichment
- New credit model: 1 credit (company) + 5 credits per contact
- Per-officer enrichment endpoint using `officerId`

**Out of scope (future PR):**
- Refactor to use `contactId` instead of `officerId`
- Support for user-created contacts (no officerId)

### Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                         API Endpoints                               │
│                                                                     │
│  POST /enrich/company          POST /enrich/officer                 │
│  { userPlaceId }               { officerId }                        │
│  1 credit                      5 credits                            │
│                                                                     │
│  • Website scraping            • LinkedIn lookup                    │
│  • Company data (Pappers)      • Email discovery                    │
│  • Officers list               • Phone lookup                       │
│  • Creates contacts            • Updates contact data               │
└──────────┬─────────────────────────────────┬───────────────────────┘
           │                                 │
           ▼                                 ▼
┌────────────────────────┐      ┌────────────────────────────────────┐
│ enrichment-company     │      │ enrichment-officer                 │
│      Queue             │      │      Queue                         │
│                        │      │                                    │
│ Uses: scraper, pappers │      │ Uses: icypeas, forager, contactout │
└────────────────────────┘      └────────────────────────────────────┘
```

### Credit Model

| Action | Credits | Use Case |
|--------|---------|----------|
| Company Enrichment | 1 | Get company data + officers list + create contacts |
| Officer Enrichment | 5 | Enrich one officer (LinkedIn + Email + Phone) |

---

## Phase 1: Database Schema Changes

### 1.1 Extend `enrichment` table

**File**: `apps/api/src/db/schema/enrichment.ts`

```typescript
export const enrichmentPhaseStatusEnum = pgEnum('enrichment_phase_status', [
  'idle',
  'queued',
  'processing',
  'completed',
  'failed'
])

// Add to enrichment table
companyEnrichedAt: timestamp('company_enriched_at'),
companyStatus: enrichmentPhaseStatusEnum('company_status').default('idle'),
```

### 1.2 Extend `enrichment_company_officer` table

**File**: `apps/api/src/db/schema/enrichment.ts`

```typescript
// Add to enrichment_company_officer table
enrichedAt: timestamp('enriched_at'),
enrichmentStatus: enrichmentPhaseStatusEnum('enrichment_status').default('idle'),
```

### 1.3 Migration file

**File**: `apps/api/src/db/migrations/XXXX_add_enrichment_phases.sql`

```sql
-- Add phase status enum
CREATE TYPE enrichment_phase_status AS ENUM ('idle', 'queued', 'processing', 'completed', 'failed');

-- Add columns to enrichment table
ALTER TABLE enrichment
ADD COLUMN company_enriched_at TIMESTAMP,
ADD COLUMN company_status enrichment_phase_status DEFAULT 'idle';

-- Add columns to enrichment_company_officer table
ALTER TABLE enrichment_company_officer
ADD COLUMN enriched_at TIMESTAMP,
ADD COLUMN enrichment_status enrichment_phase_status DEFAULT 'idle';
```

---

## Phase 2: Queue Structure

### 2.1 Company Enrichment Queue

**File**: `apps/api/src/internal/bullmq/jobs/enrichment-company/queue.ts`

```typescript
import { Queue } from 'bullmq'
import { bullmqRedisOptions, jobCleanupOptions } from '../../config'

export const queueName = 'enrichment-company'

export interface CompanyEnrichmentJobData {
  userPlaceId: string
  enrichmentId: string
  placeId: string
  userId: string
}

export const companyEnrichmentQueue = new Queue<CompanyEnrichmentJobData>(
  queueName,
  {
    connection: bullmqRedisOptions,
    defaultJobOptions: {
      removeOnComplete: jobCleanupOptions.completed,
      removeOnFail: jobCleanupOptions.failed,
      attempts: 1,
    },
  }
)

export const enqueueCompanyEnrichment = async (
  data: CompanyEnrichmentJobData
): Promise<string> => {
  const job = await companyEnrichmentQueue.add(queueName, data, {
    jobId: `company-${data.userPlaceId}-${Date.now()}`,
  })
  return job.id ?? ''
}
```

### 2.2 Officer Enrichment Queue

**File**: `apps/api/src/internal/bullmq/jobs/enrichment-officer/queue.ts`

```typescript
import { Queue } from 'bullmq'
import { bullmqRedisOptions, jobCleanupOptions } from '../../config'

export const queueName = 'enrichment-officer'

export interface OfficerEnrichmentJobData {
  officerId: string
  userPlaceId: string
  userId: string
}

export const officerEnrichmentQueue = new Queue<OfficerEnrichmentJobData>(
  queueName,
  {
    connection: bullmqRedisOptions,
    defaultJobOptions: {
      removeOnComplete: jobCleanupOptions.completed,
      removeOnFail: jobCleanupOptions.failed,
      attempts: 1,
    },
  }
)

export const enqueueOfficerEnrichment = async (
  data: OfficerEnrichmentJobData
): Promise<string> => {
  const job = await officerEnrichmentQueue.add(queueName, data, {
    jobId: `officer-${data.officerId}-${Date.now()}`,
  })
  return job.id ?? ''
}
```

### 2.3 Queue Configuration

**File**: `apps/api/src/internal/bullmq/config.ts` (update)

```typescript
export const workerConfig = {
  // ... existing configs

  enrichment_company: {
    concurrency: 20,
    lockDuration: 300000,      // 5 minutes
    renewalInterval: 60000,
    stalledInterval: 120000,
    maxStalledCount: 2,
  },

  enrichment_officer: {
    concurrency: 50,
    lockDuration: 300000,      // 5 minutes
    renewalInterval: 60000,
    stalledInterval: 120000,
    maxStalledCount: 2,
  },
}
```

---

## Phase 3: Worker Implementations

### 3.1 Company Enrichment Worker

**File**: `apps/api/src/internal/bullmq/jobs/enrichment-company/worker.ts`

Handles:
1. Website scraping (via existing scraper queue)
2. WHOIS lookup
3. Company data lookup (via existing pappers queue)
4. Officers list insertion
5. Technology detection
6. Website description generation
7. Create contacts from officers (via `populateContactFromEnrichment`)

**Note**: This is essentially the current `websiteEnrichmentManager` minus the officer enrichment phase.

```typescript
import { Job, UnrecoverableError, Worker } from 'bullmq'
import { logger } from '@ritchy/logger'
import { bullmqRedisOptions, workerConfig } from '../../config'
import { queueName, type CompanyEnrichmentJobData } from './queue'
import { companyEnrichmentService } from '../../../../services/enrichment/company_enrichment_service'
import { setCompanyEnrichmentStatus } from '../../../../services/enrichment/status_manager'

const processCompanyEnrichmentJob = async (job: Job<CompanyEnrichmentJobData>) => {
  const { userPlaceId, enrichmentId, placeId, userId } = job.data

  try {
    await setCompanyEnrichmentStatus(userPlaceId, 'processing', 'Starting company enrichment', 0)

    await companyEnrichmentService({
      userPlaceId,
      enrichmentId,
      placeId,
      userId,
    })

    await setCompanyEnrichmentStatus(userPlaceId, 'completed', 'Company enrichment completed', 100)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    await setCompanyEnrichmentStatus(userPlaceId, 'failed', errorMessage, 100, errorMessage)

    logger.error({
      msg: 'Company enrichment job failed',
      event: 'company_enrichment_error',
      metadata: { jobId: job.id, userPlaceId, error: errorMessage },
    })

    throw new UnrecoverableError(errorMessage)
  }
}

export const companyEnrichmentWorker = new Worker<CompanyEnrichmentJobData>(
  queueName,
  processCompanyEnrichmentJob,
  {
    connection: bullmqRedisOptions,
    concurrency: workerConfig.enrichment_company.concurrency,
    lockDuration: workerConfig.enrichment_company.lockDuration,
    lockRenewTime: workerConfig.enrichment_company.renewalInterval,
    stalledInterval: workerConfig.enrichment_company.stalledInterval,
    maxStalledCount: workerConfig.enrichment_company.maxStalledCount,
    limiter: {
      max: 100,
      duration: 60000,
    },
  }
)
```

### 3.2 Officer Enrichment Worker

**File**: `apps/api/src/internal/bullmq/jobs/enrichment-officer/worker.ts`

Handles enriching a single officer - this is the existing officer enrichment logic extracted:
1. LinkedIn waterfall
2. Email waterfall
3. Phone waterfall
4. Update contact data

```typescript
import { Job, UnrecoverableError, Worker } from 'bullmq'
import { logger } from '@ritchy/logger'
import { bullmqRedisOptions, workerConfig } from '../../config'
import { queueName, type OfficerEnrichmentJobData } from './queue'
import { officerEnrichmentService } from '../../../../services/enrichment/officer_enrichment_service'
import { setOfficerEnrichmentStatus } from '../../../../services/enrichment/status_manager'

const processOfficerEnrichmentJob = async (job: Job<OfficerEnrichmentJobData>) => {
  const { officerId, userPlaceId, userId } = job.data

  try {
    await setOfficerEnrichmentStatus(officerId, 'processing', 'Starting officer enrichment', 0)

    await officerEnrichmentService({
      officerId,
      userPlaceId,
      userId,
    })

    await setOfficerEnrichmentStatus(officerId, 'completed', 'Officer enrichment completed', 100)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    await setOfficerEnrichmentStatus(officerId, 'failed', errorMessage, 100, errorMessage)

    logger.error({
      msg: 'Officer enrichment job failed',
      event: 'officer_enrichment_error',
      metadata: { jobId: job.id, officerId, error: errorMessage },
    })

    throw new UnrecoverableError(errorMessage)
  }
}

export const officerEnrichmentWorker = new Worker<OfficerEnrichmentJobData>(
  queueName,
  processOfficerEnrichmentJob,
  {
    connection: bullmqRedisOptions,
    concurrency: workerConfig.enrichment_officer.concurrency,
    lockDuration: workerConfig.enrichment_officer.lockDuration,
    lockRenewTime: workerConfig.enrichment_officer.renewalInterval,
    stalledInterval: workerConfig.enrichment_officer.stalledInterval,
    maxStalledCount: workerConfig.enrichment_officer.maxStalledCount,
    limiter: {
      max: 200,
      duration: 60000,
    },
  }
)
```

---

## Phase 4: Service Layer

### 4.1 Company Enrichment Service

**File**: `apps/api/src/services/enrichment/company_enrichment_service.ts`

This is the existing `websiteEnrichmentManager` with the officer enrichment phase removed.

Key changes from current implementation:
- Remove the `officer_enrichment` phase (lines ~530-800 in current file)
- Keep: initialization, website_scan, company_search, finalization
- Still call `populateContactFromEnrichment` at the end

```typescript
// Extract from website_enrichment_manager.ts
// Remove: officer enrichment loop
// Keep: everything else

export const companyEnrichmentService = async ({
  userPlaceId,
  enrichmentId,
  placeId,
  userId,
}: CompanyEnrichmentParams): Promise<CompanyEnrichmentResult> => {
  const statusBuilder = new CompanyStatusBuilder(userPlaceId)

  // 1. Website extraction (0-10%)
  // ... existing code from websiteEnrichmentManager

  // 2. Domain validation (10-15%)
  // ... existing code

  // 3. Website scraping (15-50%)
  // ... existing code

  // 4. Company data enrichment (50-85%)
  // ... existing code (enrichGovernmentalData, getWebsiteDescription, performWhoisLookup)

  // 5. Create contacts from officers (85-95%)
  await statusBuilder.update('Creating contacts from officers', 85)
  await populateContactFromEnrichment({ enrichmentId, userPlaceId })

  // 6. Save results (95-100%)
  await db.update(enrichmentTable)
    .set({
      companyStatus: 'completed',
      companyEnrichedAt: new Date(),
      success: true,
    })
    .where(eq(enrichmentTable.id, enrichmentId))

  return { success: true, enrichmentId }
}
```

### 4.2 Officer Enrichment Service

**File**: `apps/api/src/services/enrichment/officer_enrichment_service.ts`

This is the existing officer enrichment logic from `enrich_company_officers.ts`, extracted for a single officer.

```typescript
import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { enrichmentCompanyOfficer } from '../../db/schema'
import { getOfficerEnrichmentContext } from './queries/get_officer_enrichment_context'
import { runLinkedInWaterfall } from './governmental_data/waterfalls/linkedin_waterfall'
import { runEmailWaterfallWithData } from './governmental_data/waterfalls/email_waterfall'
import { runPhoneWaterfall } from './governmental_data/waterfalls/phone_waterfall'
import { updateContactFromOfficer } from '../contact/update_contact_from_officer'
import { OfficerStatusBuilder } from './status_builder'

interface OfficerEnrichmentParams {
  officerId: string
  userPlaceId: string
  userId: string
}

interface OfficerEnrichmentResult {
  success: boolean
  officerId: string
  linkedinFound: boolean
  emailFound: boolean
  phoneFound: boolean
}

export const officerEnrichmentService = async ({
  officerId,
  userPlaceId,
  userId,
}: OfficerEnrichmentParams): Promise<OfficerEnrichmentResult> => {
  const statusBuilder = new OfficerStatusBuilder(officerId)

  // 1. Fetch officer context (0-10%)
  await statusBuilder.update('Loading officer information', 5)
  const context = await getOfficerEnrichmentContext(officerId)

  if (!context) {
    throw new Error('Officer not found')
  }

  // Check if already enriched
  if (context.officer.enrichmentStatus === 'completed') {
    return {
      success: true,
      officerId,
      linkedinFound: !!context.officer.linkedinUrl,
      emailFound: context.emails.length > 0,
      phoneFound: context.phones.length > 0,
    }
  }

  // Mark as processing
  await db.update(enrichmentCompanyOfficer)
    .set({ enrichmentStatus: 'processing' })
    .where(eq(enrichmentCompanyOfficer.id, officerId))

  let linkedinFound = false
  let emailFound = false
  let phoneFound = false

  try {
    // 2. LinkedIn enrichment (10-40%)
    await statusBuilder.update('Finding professional profile', 15)
    const linkedinResult = await runLinkedInWaterfall({
      officerId,
      officer: context.officer,
      company: context.company,
      place: context.place,
      userPlaceId,
      trackStatus: false,
    })
    linkedinFound = !!linkedinResult?.profileUrl

    // 3. Email enrichment (40-70%)
    await statusBuilder.update('Searching for email addresses', 45)
    const emailResult = await runEmailWaterfallWithData({
      officerId,
      officer: context.officer,
      website: context.place.website,
      userPlaceId,
      trackStatus: false,
    })
    emailFound = (emailResult?.emails?.length ?? 0) > 0

    // 4. Phone enrichment (70-90%)
    await statusBuilder.update('Looking up phone numbers', 75)
    const phoneResult = await runPhoneWaterfall({
      officerId,
      userPlaceId,
      trackStatus: false,
    })
    phoneFound = (phoneResult?.phones?.length ?? 0) > 0

    // 5. Update contact from officer data (90-95%)
    await statusBuilder.update('Updating contact information', 92)
    await updateContactFromOfficer(officerId, userPlaceId)

    // 6. Finalize (95-100%)
    await statusBuilder.update('Saving results', 97)

    await db.update(enrichmentCompanyOfficer)
      .set({
        enrichmentStatus: 'completed',
        enrichedAt: new Date(),
      })
      .where(eq(enrichmentCompanyOfficer.id, officerId))

    await statusBuilder.complete()

    return {
      success: true,
      officerId,
      linkedinFound,
      emailFound,
      phoneFound,
    }
  } catch (error) {
    await db.update(enrichmentCompanyOfficer)
      .set({ enrichmentStatus: 'failed' })
      .where(eq(enrichmentCompanyOfficer.id, officerId))

    await statusBuilder.fail(error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}
```

### 4.3 Get Officer Enrichment Context Query

**File**: `apps/api/src/services/enrichment/queries/get_officer_enrichment_context.ts`

This query already exists in some form - we're formalizing it.

```typescript
import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import {
  enrichmentCompanyOfficer,
  enrichmentCompanyOfficerEmail,
  enrichmentCompanyOfficerPhone,
  enrichmentCompanyOfficerLinkedin,
  enrichmentCompany,
  enrichment,
  userPlace,
  place,
} from '../../../db/schema'

interface OfficerEnrichmentContext {
  officer: {
    id: string
    firstName: string | null
    lastName: string | null
    role: string | null
    function: string | null
    enrichmentStatus: string
    linkedinUrl: string | null
  }
  company: {
    id: string
    name: string | null
    siren: string | null
    siret: string | null
  }
  place: {
    website: string | null
    name: string | null
  }
  emails: Array<{ email: string }>
  phones: Array<{ phone: string }>
}

export const getOfficerEnrichmentContext = async (
  officerId: string
): Promise<OfficerEnrichmentContext | null> => {
  // Get officer with company
  const officerResult = await db
    .select({
      officer: {
        id: enrichmentCompanyOfficer.id,
        firstName: enrichmentCompanyOfficer.firstName,
        lastName: enrichmentCompanyOfficer.lastName,
        role: enrichmentCompanyOfficer.role,
        function: enrichmentCompanyOfficer.function,
        enrichmentStatus: enrichmentCompanyOfficer.enrichmentStatus,
      },
      company: {
        id: enrichmentCompany.id,
        name: enrichmentCompany.name,
        siren: enrichmentCompany.siren,
        siret: enrichmentCompany.siret,
      },
    })
    .from(enrichmentCompanyOfficer)
    .innerJoin(enrichmentCompany, eq(enrichmentCompany.id, enrichmentCompanyOfficer.companyId))
    .where(eq(enrichmentCompanyOfficer.id, officerId))
    .limit(1)

  if (!officerResult.length) {
    return null
  }

  const { officer, company } = officerResult[0]

  // Get LinkedIn URL if exists
  const linkedinResult = await db
    .select({ url: enrichmentCompanyOfficerLinkedin.url })
    .from(enrichmentCompanyOfficerLinkedin)
    .where(eq(enrichmentCompanyOfficerLinkedin.officerId, officerId))
    .limit(1)

  // Get place data through enrichment
  const placeResult = await db
    .select({
      website: place.website,
      name: place.name,
    })
    .from(enrichmentCompany)
    .innerJoin(enrichment, eq(enrichment.id, enrichmentCompany.enrichmentId))
    .innerJoin(userPlace, eq(userPlace.id, enrichment.userPlaceId))
    .innerJoin(place, eq(place.id, userPlace.placeId))
    .where(eq(enrichmentCompany.id, company.id))
    .limit(1)

  // Get existing emails and phones
  const [emails, phones] = await Promise.all([
    db
      .select({ email: enrichmentCompanyOfficerEmail.email })
      .from(enrichmentCompanyOfficerEmail)
      .where(eq(enrichmentCompanyOfficerEmail.officerId, officerId)),
    db
      .select({ phone: enrichmentCompanyOfficerPhone.phone })
      .from(enrichmentCompanyOfficerPhone)
      .where(eq(enrichmentCompanyOfficerPhone.officerId, officerId)),
  ])

  return {
    officer: {
      ...officer,
      linkedinUrl: linkedinResult[0]?.url ?? null,
    },
    company,
    place: placeResult[0] ?? { website: null, name: null },
    emails,
    phones,
  }
}
```

---

## Phase 5: Status Manager Updates

### 5.1 Separate Status Tracking

**File**: `apps/api/src/services/enrichment/status_manager.ts` (update)

```typescript
export type EnrichmentProgressStatus = 'idle' | 'queued' | 'processing' | 'completed' | 'failed'

// Status keys
const COMPANY_STATUS_KEY = (userPlaceId: string) => `enrichment:company:status:${userPlaceId}`
const OFFICER_STATUS_KEY = (officerId: string) => `enrichment:officer:status:${officerId}`

export interface PhaseStatus {
  status: EnrichmentProgressStatus
  step: string
  progress: number
  updatedAt: number
  error?: string
}

// Set company enrichment status
export const setCompanyEnrichmentStatus = async (
  userPlaceId: string,
  status: EnrichmentProgressStatus,
  step: string,
  progress: number,
  error?: string
): Promise<void> => {
  const statusData: PhaseStatus = {
    status,
    step,
    progress,
    updatedAt: Date.now(),
    ...(error && { error }),
  }

  const ttl = status === 'completed' || status === 'failed' ? 1800 : 3600
  await redis.setex(COMPANY_STATUS_KEY(userPlaceId), ttl, JSON.stringify(statusData))

  emitEnrichmentStatusUpdate(userPlaceId, { company: statusData })
}

// Set officer enrichment status
export const setOfficerEnrichmentStatus = async (
  officerId: string,
  status: EnrichmentProgressStatus,
  step: string,
  progress: number,
  error?: string
): Promise<void> => {
  const statusData: PhaseStatus = {
    status,
    step,
    progress,
    updatedAt: Date.now(),
    ...(error && { error }),
  }

  const ttl = status === 'completed' || status === 'failed' ? 1800 : 3600
  await redis.setex(OFFICER_STATUS_KEY(officerId), ttl, JSON.stringify(statusData))

  emitOfficerStatusUpdate(officerId, statusData)
}

// Get company status
export const getCompanyEnrichmentStatus = async (userPlaceId: string): Promise<PhaseStatus> => {
  const raw = await redis.get(COMPANY_STATUS_KEY(userPlaceId))
  return raw ? JSON.parse(raw) : { status: 'idle', step: '', progress: 0, updatedAt: Date.now() }
}

// Get officer status
export const getOfficerEnrichmentStatus = async (officerId: string): Promise<PhaseStatus> => {
  const raw = await redis.get(OFFICER_STATUS_KEY(officerId))
  return raw ? JSON.parse(raw) : { status: 'idle', step: '', progress: 0, updatedAt: Date.now() }
}
```

### 5.2 Status Builders

**File**: `apps/api/src/services/enrichment/status_builder.ts` (update)

```typescript
import { setCompanyEnrichmentStatus, setOfficerEnrichmentStatus } from './status_manager'

// Company status builder
export class CompanyStatusBuilder {
  constructor(private userPlaceId: string) {}

  async update(message: string, progress: number): Promise<void> {
    await setCompanyEnrichmentStatus(this.userPlaceId, 'processing', message, progress)
  }

  async complete(message = 'Company enrichment completed'): Promise<void> {
    await setCompanyEnrichmentStatus(this.userPlaceId, 'completed', message, 100)
  }

  async fail(error: string): Promise<void> {
    await setCompanyEnrichmentStatus(this.userPlaceId, 'failed', error, 100, error)
  }
}

// Officer status builder
export class OfficerStatusBuilder {
  constructor(private officerId: string) {}

  async update(message: string, progress: number): Promise<void> {
    await setOfficerEnrichmentStatus(this.officerId, 'processing', message, progress)
  }

  async complete(message = 'Officer enrichment completed'): Promise<void> {
    await setOfficerEnrichmentStatus(this.officerId, 'completed', message, 100)
  }

  async fail(error: string): Promise<void> {
    await setOfficerEnrichmentStatus(this.officerId, 'failed', error, 100, error)
  }
}
```

---

## Phase 6: API Endpoints

### 6.1 Company Enrichment Endpoint

**File**: `apps/api/src/routes_web/enrich/company.ts`

```typescript
import { z } from 'zod'
import { protectedProcedure } from '../../trpc'
import { enqueueCompanyEnrichment } from '../../internal/bullmq/jobs/enrichment-company/queue'
import { consumeCredits } from '../payment/queries/consume_credits'
import { getPlaceByUserPlaceId } from '../../services/places/queries/get_place_by_user_place_id'
import { getOrCreateEnrichment } from '../../services/enrichment/queries/get_or_create_enrichment'
import { setCompanyEnrichmentStatus } from '../../services/enrichment/status_manager'

const COMPANY_CREDITS = 1

const enrichCompanyInputSchema = z.object({
  userPlaceId: z.string().uuid(),
})

export const enrichCompany = protectedProcedure
  .input(enrichCompanyInputSchema)
  .mutation(async ({ input, ctx }) => {
    const { userPlaceId } = input
    const userId = ctx.user.id

    // Get place
    const place = await getPlaceByUserPlaceId(userPlaceId)
    if (!place) {
      throw new Error('Place not found')
    }

    // Get or create enrichment record
    const enrichment = await getOrCreateEnrichment(userPlaceId, place.id)

    // Check if already enriched
    if (enrichment.companyStatus === 'completed') {
      return {
        success: true,
        message: 'Company already enriched',
        enrichmentId: enrichment.id,
        alreadyEnriched: true,
        credits: 0,
      }
    }

    // Consume credits
    await consumeCredits(userId, COMPANY_CREDITS)

    // Update status and queue
    await setCompanyEnrichmentStatus(userPlaceId, 'queued', 'Waiting to start', 0)

    await enqueueCompanyEnrichment({
      userPlaceId,
      enrichmentId: enrichment.id,
      placeId: place.id,
      userId,
    })

    return {
      success: true,
      message: 'Company enrichment queued',
      enrichmentId: enrichment.id,
      alreadyEnriched: false,
      credits: COMPANY_CREDITS,
    }
  })
```

### 6.2 Officer Enrichment Endpoint

**File**: `apps/api/src/routes_web/enrich/officer.ts`

```typescript
import { z } from 'zod'
import { protectedProcedure } from '../../trpc'
import { enqueueOfficerEnrichment } from '../../internal/bullmq/jobs/enrichment-officer/queue'
import { consumeCredits } from '../payment/queries/consume_credits'
import { getOfficerWithAccess } from '../../services/enrichment/queries/get_officer_with_access'
import { setOfficerEnrichmentStatus } from '../../services/enrichment/status_manager'

const OFFICER_CREDITS = 5

const enrichOfficerInputSchema = z.object({
  officerId: z.string().uuid(),
})

export const enrichOfficer = protectedProcedure
  .input(enrichOfficerInputSchema)
  .mutation(async ({ input, ctx }) => {
    const { officerId } = input
    const userId = ctx.user.id

    // Get officer and verify user has access
    const officer = await getOfficerWithAccess(officerId, userId)
    if (!officer) {
      throw new Error('Officer not found or access denied')
    }

    // Check if already enriched
    if (officer.enrichmentStatus === 'completed') {
      return {
        success: true,
        message: 'Officer already enriched',
        officerId,
        alreadyEnriched: true,
        credits: 0,
      }
    }

    // Check if company enrichment is done
    if (officer.companyStatus !== 'completed') {
      throw new Error('Company enrichment must be completed first')
    }

    // Consume credits
    await consumeCredits(userId, OFFICER_CREDITS)

    // Update status and queue
    await setOfficerEnrichmentStatus(officerId, 'queued', 'Waiting to start', 0)

    await enqueueOfficerEnrichment({
      officerId,
      userPlaceId: officer.userPlaceId,
      userId,
    })

    return {
      success: true,
      message: 'Officer enrichment queued',
      officerId,
      alreadyEnriched: false,
      credits: OFFICER_CREDITS,
    }
  })
```

### 6.3 Get Officer With Access Query

**File**: `apps/api/src/services/enrichment/queries/get_officer_with_access.ts`

```typescript
import { eq, and } from 'drizzle-orm'
import { db } from '../../../db/db'
import {
  enrichmentCompanyOfficer,
  enrichmentCompany,
  enrichment,
  userPlace,
} from '../../../db/schema'

interface OfficerWithAccess {
  id: string
  enrichmentStatus: string
  companyStatus: string
  userPlaceId: string
}

export const getOfficerWithAccess = async (
  officerId: string,
  userId: string
): Promise<OfficerWithAccess | null> => {
  const result = await db
    .select({
      id: enrichmentCompanyOfficer.id,
      enrichmentStatus: enrichmentCompanyOfficer.enrichmentStatus,
      companyStatus: enrichment.companyStatus,
      userPlaceId: userPlace.id,
    })
    .from(enrichmentCompanyOfficer)
    .innerJoin(enrichmentCompany, eq(enrichmentCompany.id, enrichmentCompanyOfficer.companyId))
    .innerJoin(enrichment, eq(enrichment.id, enrichmentCompany.enrichmentId))
    .innerJoin(userPlace, eq(userPlace.id, enrichment.userPlaceId))
    .where(
      and(
        eq(enrichmentCompanyOfficer.id, officerId),
        eq(userPlace.userId, userId)
      )
    )
    .limit(1)

  return result[0] ?? null
}
```

### 6.4 Status Endpoints

**File**: `apps/api/src/routes_web/enrich/status.ts` (update)

```typescript
// Company status
export const getCompanyStatusRoute = protectedProcedure
  .input(z.object({ userPlaceId: z.string().uuid() }))
  .query(async ({ input }) => {
    return getCompanyEnrichmentStatus(input.userPlaceId)
  })

// Officer status
export const getOfficerStatusRoute = protectedProcedure
  .input(z.object({ officerId: z.string().uuid() }))
  .query(async ({ input }) => {
    return getOfficerEnrichmentStatus(input.officerId)
  })

// Batch officer status
export const getBatchOfficerStatusRoute = protectedProcedure
  .input(z.object({ officerIds: z.array(z.string().uuid()) }))
  .query(async ({ input }) => {
    const statuses = await Promise.all(
      input.officerIds.map(async (id) => ({
        officerId: id,
        ...await getOfficerEnrichmentStatus(id),
      }))
    )
    return statuses
  })
```

---

## Phase 7: Frontend Updates

### 7.1 Officer Card with Enrich Button

**File**: `apps/front/src/features/enrichment/components/officer-card.tsx`

```typescript
interface OfficerCardProps {
  officer: Officer
}

export const OfficerCard = ({ officer }: OfficerCardProps) => {
  const { mutate: enrichOfficer, isPending } = useOfficerEnrichment()
  const { data: status } = useOfficerStatus(officer.id)

  const isEnriched = officer.enrichmentStatus === 'completed'
  const isProcessing = status?.status === 'processing' || status?.status === 'queued'

  return (
    <Card>
      <CardHeader>
        <CardTitle>{officer.firstName} {officer.lastName}</CardTitle>
        <CardDescription>{officer.role}</CardDescription>
      </CardHeader>

      <CardContent>
        {isEnriched ? (
          <div className="space-y-2">
            {officer.linkedinUrl && <LinkedInBadge url={officer.linkedinUrl} />}
            {officer.emails?.map(email => <EmailBadge key={email.id} email={email} />)}
            {officer.phones?.map(phone => <PhoneBadge key={phone.id} phone={phone} />)}
          </div>
        ) : isProcessing ? (
          <div className="flex items-center gap-2">
            <Spinner />
            <span>{status?.step}</span>
            <Progress value={status?.progress} />
          </div>
        ) : (
          <Button
            onClick={() => enrichOfficer({ officerId: officer.id })}
            disabled={isPending}
          >
            Enrich Officer (5 credits)
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

### 7.2 Hooks

**File**: `apps/front/src/features/enrichment/hooks/use-enrichment.ts`

```typescript
// Company enrichment
export const useCompanyEnrichment = () => {
  return useMutation({
    mutationFn: async ({ userPlaceId }: { userPlaceId: string }) => {
      return trpc.enrich.company.mutate({ userPlaceId })
    },
  })
}

// Officer enrichment
export const useOfficerEnrichment = () => {
  return useMutation({
    mutationFn: async ({ officerId }: { officerId: string }) => {
      return trpc.enrich.officer.mutate({ officerId })
    },
  })
}

// Officer status with polling
export const useOfficerStatus = (officerId: string) => {
  return useQuery({
    queryKey: ['officer-status', officerId],
    queryFn: async () => trpc.enrich.officerStatus.query({ officerId }),
    refetchInterval: (data) =>
      data?.status === 'processing' || data?.status === 'queued' ? 2000 : false,
  })
}
```

---

## Files Summary

### New Files to Create (10 files)

| File | Description |
|------|-------------|
| `apps/api/src/internal/bullmq/jobs/enrichment-company/queue.ts` | Company queue |
| `apps/api/src/internal/bullmq/jobs/enrichment-company/worker.ts` | Company worker |
| `apps/api/src/internal/bullmq/jobs/enrichment-officer/queue.ts` | Officer queue |
| `apps/api/src/internal/bullmq/jobs/enrichment-officer/worker.ts` | Officer worker |
| `apps/api/src/services/enrichment/company_enrichment_service.ts` | Company enrichment (extracted from websiteEnrichmentManager) |
| `apps/api/src/services/enrichment/officer_enrichment_service.ts` | Officer enrichment (extracted from enrich_company_officers) |
| `apps/api/src/services/enrichment/queries/get_officer_enrichment_context.ts` | Officer context query |
| `apps/api/src/services/enrichment/queries/get_officer_with_access.ts` | Access verification |
| `apps/api/src/routes_web/enrich/company.ts` | Company endpoint |
| `apps/api/src/routes_web/enrich/officer.ts` | Officer endpoint |

### Files to Modify (7 files)

| File | Changes |
|------|---------|
| `apps/api/src/db/schema/enrichment.ts` | Add phase status enum and columns |
| `apps/api/src/services/enrichment/status_manager.ts` | Add company/officer tracking |
| `apps/api/src/services/enrichment/status_builder.ts` | Add CompanyStatusBuilder, OfficerStatusBuilder |
| `apps/api/src/routes_web/enrich/status.ts` | Add status endpoints |
| `apps/api/src/internal/bullmq/config.ts` | Add worker configs |
| `apps/front/src/features/enrichment/hooks/use-enrichment.ts` | Add new hooks |
| `apps/front/src/features/enrichment/components/officer-card.tsx` | Add enrich button |

### Files to Remove (after migration)

| File | Reason |
|------|--------|
| `apps/api/src/internal/bullmq/jobs/enrichment/queue.ts` | Replaced by company + officer queues |
| `apps/api/src/internal/bullmq/jobs/enrichment/worker.ts` | Replaced by company + officer workers |
| `apps/api/src/services/enrichment/website_enrichment_manager.ts` | Split into company + officer services |

---

## Credit System Summary

| Action | Credits | What's Included |
|--------|---------|-----------------|
| Company Enrichment | 1 | Website, WHOIS, company data, officers list, contacts created |
| Officer Enrichment | 5 | LinkedIn + Email + Phone for ONE officer |

### Example Scenarios

| Scenario | Credits |
|----------|---------|
| Company only | 1 |
| Company + 1 officer | 1 + 5 = 6 |
| Company + 3 officers | 1 + 15 = 16 |
| Enrich officer later | 5 |

---

## Implementation Notes

### What Changes

1. **Split the monolithic worker** - Current `enrichment-unit` worker does everything. We split into:
   - `enrichment-company` - Everything up to officer list
   - `enrichment-officer` - LinkedIn/Email/Phone per officer

2. **Extract services from existing code** - No new logic, just reorganization:
   - `company_enrichment_service.ts` ← `website_enrichment_manager.ts` (minus officer loop)
   - `officer_enrichment_service.ts` ← `enrich_company_officers.ts` (single officer)

3. **Existing waterfalls unchanged** - `runLinkedInWaterfall`, `runEmailWaterfallWithData`, `runPhoneWaterfall` continue to use `officerId`

### What Stays the Same

- All external provider integrations (icypeas, forager, contactout, pappers, scraper)
- Waterfall function signatures
- Data storage in `enrichment_company_officer_*` tables
- `populateContactFromEnrichment` logic

---

## Future Work (Next PR)

- Refactor to use `contactId` instead of `officerId`
- Support user-created contacts (no officerId)
- Consider partial failure handling and retry logic
