# Contact Enrichment Refactor - Separated Flows

## Overview

This document outlines the refactoring of the enrichment system to support both officer-based contacts (Pappers) and manual contacts (user-created) with **completely separated code paths**.

### Why Separated Flows?

**Problems with unified approach:**
- Conditional branching (`if officerId`) in every waterfall
- Mixing two conceptually different flows
- Harder to test, debug, and maintain

**Benefits of separation:**
- Each function has one responsibility
- No conditional branching in waterfalls
- Easier to test independently
- Specialized waterfalls per contact type

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Contact Enrichment                          │
├─────────────────────────────────┬───────────────────────────────┤
│   Officer Contact (Pappers)     │   Manual Contact (User)       │
├─────────────────────────────────┼───────────────────────────────┤
│ enrichOfficerContact()          │ enrichManualContact()         │
│         │                       │         │                     │
│         ▼                       │         ▼                     │
│ runOfficerLinkedInWaterfall()   │ runContactLinkedInWaterfall() │
│ runOfficerEmailWaterfall()      │ runContactEmailWaterfall()    │
│ runOfficerPhoneWaterfall()      │ runContactPhoneWaterfall()    │
│         │                       │         │                     │
│         ▼                       │         ▼                     │
│ enrichment_company_officer_*    │ contact_linkedin              │
│         │                       │ contact_email                 │
│         ▼                       │ contact_phone                 │
│ populateContactFromEnrichment() │         │                     │
│         │                       │         │                     │
│         ▼                       │         ▼                     │
│ contact_* tables                │ (already in contact_* tables) │
└─────────────────────────────────┴───────────────────────────────┘
```

### Scope

**In scope:**
- Create separate waterfall functions for officer vs manual contacts
- Create `enrichOfficerContact()` and `enrichManualContact()` orchestrators
- Add enrichment tracking to `contact` table
- Create `contact_linkedin` table for manual contacts
- Keep existing officer enrichment flow mostly intact

**Out of scope:**
- Worker separation (next PR)
- New credit model (next PR)

---

## Phase 1: Database Schema Changes

### 1.1 Add enrichment tracking to `contact` table

**File**: `apps/api/src/db/schema/contact.ts`

```typescript
// Add to contact table
enrichedAt: timestamp('enriched_at'),
enrichmentStatus: enrichmentPhaseStatusEnum('enrichment_status').default('idle'),
linkedinUrl: text('linkedin_url'),  // User-provided LinkedIn URL (manual contacts only)
```

### 1.2 Add `contact_linkedin` table

For manual contacts, we need a dedicated table (mirrors `enrichment_company_officer_linkedin`):

**File**: `apps/api/src/db/schema/contact.ts`

```typescript
export const contactLinkedin = pgTable(
  'contact_linkedin',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contact.id, { onDelete: 'cascade' }),
    profileUrl: text('profile_url').notNull(),
    confidence: integer('confidence').notNull(),
    reasoning: text('reasoning'),
    source: text('source').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.contactId, table.profileUrl),
    index('idx_contact_linkedin_contact_id').on(table.contactId),
  ],
)
```

### 1.3 Migration

**File**: `apps/api/src/db/migrations/XXXX_add_contact_enrichment.sql`

```sql
-- Reuse existing enum if created, or create new
DO $$ BEGIN
  CREATE TYPE enrichment_phase_status AS ENUM ('idle', 'queued', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add enrichment tracking and linkedin_url to contact
ALTER TABLE contact
ADD COLUMN enriched_at TIMESTAMP,
ADD COLUMN enrichment_status enrichment_phase_status DEFAULT 'idle',
ADD COLUMN linkedin_url TEXT;

-- Create contact_linkedin table (mirrors enrichment_company_officer_linkedin)
CREATE TABLE contact_linkedin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contact(id) ON DELETE CASCADE,
  profile_url TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  reasoning TEXT,
  source TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(contact_id, profile_url)
);

CREATE INDEX idx_contact_linkedin_contact_id ON contact_linkedin(contact_id);
```

---

## Phase 2: Officer Contact Enrichment (Pappers)

This flow remains mostly unchanged - it's the existing enrichment with minor refactoring.

### 2.1 Create Contacts From Officers

**File**: `apps/api/src/services/contact/create_contacts_from_officers.ts`

```typescript
import { eq } from 'drizzle-orm'
import { db } from '../../db/db'
import {
  contact,
  enrichmentCompanyOfficer,
  enrichmentCompany,
} from '../../db/schema'

interface CreateContactsFromOfficersParams {
  enrichmentId: string
  userPlaceId: string
}

interface OfficerContact {
  contactId: string
  officerId: string
  firstName: string | null
  lastName: string | null
}

/**
 * Creates contacts from enrichment officers.
 * Called after company enrichment, before officer contact enrichment.
 */
export const createContactsFromOfficers = async ({
  enrichmentId,
  userPlaceId,
}: CreateContactsFromOfficersParams): Promise<OfficerContact[]> => {
  // Get company for this enrichment
  const [company] = await db
    .select({ id: enrichmentCompany.id })
    .from(enrichmentCompany)
    .where(eq(enrichmentCompany.enrichmentId, enrichmentId))
    .limit(1)

  if (!company) {
    return []
  }

  // Get all physical person officers
  const officers = await db
    .select({
      id: enrichmentCompanyOfficer.id,
      firstName: enrichmentCompanyOfficer.firstName,
      lastName: enrichmentCompanyOfficer.lastName,
      type: enrichmentCompanyOfficer.type,
    })
    .from(enrichmentCompanyOfficer)
    .where(eq(enrichmentCompanyOfficer.companyId, company.id))

  const physicalOfficers = officers.filter(o => o.type === 'physical')

  if (physicalOfficers.length === 0) {
    return []
  }

  // Check which officers already have contacts
  const existingContacts = await db
    .select({
      officerId: contact.officerId,
      contactId: contact.id,
    })
    .from(contact)
    .where(eq(contact.userPlaceId, userPlaceId))

  const existingOfficerIds = new Set(
    existingContacts.map(c => c.officerId).filter(Boolean)
  )

  // Create contacts for officers that don't have one
  const officersToCreate = physicalOfficers.filter(
    o => !existingOfficerIds.has(o.id)
  )

  const createdContacts: OfficerContact[] = []

  for (const officer of officersToCreate) {
    const [newContact] = await db
      .insert(contact)
      .values({
        userPlaceId,
        officerId: officer.id,
        firstName: officer.firstName,
        lastName: officer.lastName,
        type: 'physical',
        isPrimary: false,
        enrichmentStatus: 'idle',
      })
      .returning({ id: contact.id })

    createdContacts.push({
      contactId: newContact.id,
      officerId: officer.id,
      firstName: officer.firstName,
      lastName: officer.lastName,
    })
  }

  // Also return existing contacts (they may need re-enrichment)
  const existingWithData = existingContacts
    .filter(c => c.officerId)
    .map(c => {
      const officer = physicalOfficers.find(o => o.id === c.officerId)
      return {
        contactId: c.contactId,
        officerId: c.officerId!,
        firstName: officer?.firstName ?? null,
        lastName: officer?.lastName ?? null,
      }
    })

  return [...createdContacts, ...existingWithData]
}
```

### 2.2 Officer Enrichment Context

**File**: `apps/api/src/services/enrichment/queries/get_officer_enrichment_context.ts`

```typescript
import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import {
  contact,
  userPlace,
  place,
  enrichmentCompanyOfficer,
  enrichmentCompany,
  enrichmentCompanyActivity,
} from '../../../db/schema'

export interface OfficerEnrichmentContext {
  contact: {
    id: string
    firstName: string | null
    lastName: string | null
    enrichmentStatus: string
  }
  officer: {
    id: string
    role: string | null
    function: string | null
  }
  company: {
    id: string
    name: string | null
    siren: string | null
    siret: string | null
    activities: Array<{ code: string; label: string }>
  }
  place: {
    website: string | null
    name: string | null
  }
  userPlaceId: string
}

/**
 * Get enrichment context for an officer-based contact.
 * Returns null if contact doesn't have an officerId.
 */
export const getOfficerEnrichmentContext = async (
  contactId: string
): Promise<OfficerEnrichmentContext | null> => {
  // Get contact with place data
  const result = await db
    .select({
      contact: {
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        officerId: contact.officerId,
        enrichmentStatus: contact.enrichmentStatus,
      },
      userPlaceId: userPlace.id,
      place: {
        website: place.website,
        name: place.name,
      },
    })
    .from(contact)
    .innerJoin(userPlace, eq(userPlace.id, contact.userPlaceId))
    .innerJoin(place, eq(place.id, userPlace.placeId))
    .where(eq(contact.id, contactId))
    .limit(1)

  if (!result.length || !result[0].contact.officerId) {
    return null  // Not an officer contact
  }

  const row = result[0]

  // Get officer and company data
  const officerResult = await db
    .select({
      officer: {
        id: enrichmentCompanyOfficer.id,
        role: enrichmentCompanyOfficer.role,
        function: enrichmentCompanyOfficer.function,
      },
      company: {
        id: enrichmentCompany.id,
        name: enrichmentCompany.name,
        siren: enrichmentCompany.siren,
        siret: enrichmentCompany.siret,
      },
    })
    .from(enrichmentCompanyOfficer)
    .innerJoin(
      enrichmentCompany,
      eq(enrichmentCompany.id, enrichmentCompanyOfficer.companyId)
    )
    .where(eq(enrichmentCompanyOfficer.id, row.contact.officerId))
    .limit(1)

  if (!officerResult.length) {
    return null
  }

  // Get company activities
  const activities = await db
    .select({
      code: enrichmentCompanyActivity.code,
      label: enrichmentCompanyActivity.label,
    })
    .from(enrichmentCompanyActivity)
    .where(eq(enrichmentCompanyActivity.companyId, officerResult[0].company.id))

  return {
    contact: {
      id: row.contact.id,
      firstName: row.contact.firstName,
      lastName: row.contact.lastName,
      enrichmentStatus: row.contact.enrichmentStatus,
    },
    officer: officerResult[0].officer,
    company: {
      ...officerResult[0].company,
      activities,
    },
    place: row.place,
    userPlaceId: row.userPlaceId,
  }
}
```

### 2.3 Officer Waterfalls (Keep Existing)

The existing waterfall functions remain largely unchanged. They continue to:
- Accept `officerId` as the primary identifier
- Store results in `enrichment_company_officer_*` tables

**Files** (minimal changes):
- `run_linkedin_waterfall.ts` - keep `officerId` parameter, store in `enrichment_company_officer_linkedin`
- `run_email_waterfall_with_data.ts` - keep `officerId` parameter, store in `enrichment_company_officer_email`
- `run_phone_waterfall.ts` - keep `officerId` parameter, store in `enrichment_company_officer_phone`

### 2.4 Enrich Officer Contact Orchestrator

**File**: `apps/api/src/services/enrichment/enrich_officer_contact.ts`

```typescript
import { eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { contact } from '../../db/schema'
import { getOfficerEnrichmentContext } from './queries/get_officer_enrichment_context'
import { runLinkedInWaterfall } from './governmental_data/waterfalls/linkedin_waterfall/run_linkedin_waterfall'
import { runEmailWaterfallWithData } from './governmental_data/waterfalls/email_waterfall/run_email_waterfall_with_data'
import { runPhoneWaterfall } from './governmental_data/waterfalls/phone_waterfall/run_phone_waterfall'

interface EnrichOfficerContactParams {
  contactId: string
  userPlaceId: string
}

interface EnrichOfficerContactResult {
  success: boolean
  contactId: string
  officerId: string
  linkedinFound: boolean
  emailsFound: number
  phonesFound: number
}

/**
 * Enriches an officer-based contact (Pappers).
 * Stores data in enrichment_company_officer_* tables.
 * Use populateContactFromEnrichment() after to copy to contact_* tables.
 */
export const enrichOfficerContact = async ({
  contactId,
  userPlaceId,
}: EnrichOfficerContactParams): Promise<EnrichOfficerContactResult> => {
  // Get officer context
  const context = await getOfficerEnrichmentContext(contactId)
  if (!context) {
    throw new Error('Contact not found or not an officer contact')
  }

  // Check if already enriched
  if (context.contact.enrichmentStatus === 'completed') {
    return {
      success: true,
      contactId,
      officerId: context.officer.id,
      linkedinFound: false,
      emailsFound: 0,
      phonesFound: 0,
    }
  }

  // Mark as processing
  await db
    .update(contact)
    .set({ enrichmentStatus: 'processing' })
    .where(eq(contact.id, contactId))

  const person = {
    firstName: context.contact.firstName,
    lastName: context.contact.lastName,
    role: context.officer.role,
    function: context.officer.function,
  }

  let linkedinFound = false
  let emailsFound = 0
  let phonesFound = 0

  try {
    // 1. LinkedIn enrichment → enrichment_company_officer_linkedin
    const linkedinResult = await runLinkedInWaterfall({
      officerId: context.officer.id,
      person,
      company: context.company,
      place: context.place,
      userPlaceId,
    })
    linkedinFound = linkedinResult.success

    // 2. Email enrichment → enrichment_company_officer_email
    const emailResult = await runEmailWaterfallWithData({
      officerId: context.officer.id,
      person,
      website: context.place.website,
      userPlaceId,
    })
    emailsFound = emailResult.data?.length ?? 0

    // 3. Phone enrichment → enrichment_company_officer_phone
    const phoneResult = await runPhoneWaterfall({
      officerId: context.officer.id,
      person,
      userPlaceId,
    })
    phonesFound = phoneResult.data?.length ?? 0

    // Mark as completed
    await db
      .update(contact)
      .set({
        enrichmentStatus: 'completed',
        enrichedAt: new Date(),
      })
      .where(eq(contact.id, contactId))

    return {
      success: true,
      contactId,
      officerId: context.officer.id,
      linkedinFound,
      emailsFound,
      phonesFound,
    }
  } catch (error) {
    // Mark as failed
    await db
      .update(contact)
      .set({ enrichmentStatus: 'failed' })
      .where(eq(contact.id, contactId))

    throw error
  }
}
```

---

## Phase 3: Manual Contact Enrichment (User-Created)

This is a new, clean flow for contacts without an `officerId`.

### 3.1 Manual Contact Enrichment Context

**File**: `apps/api/src/services/enrichment/queries/get_manual_contact_enrichment_context.ts`

```typescript
import { eq } from 'drizzle-orm'
import { db } from '../../../db/db'
import { contact, userPlace, place } from '../../../db/schema'

export interface ManualContactEnrichmentContext {
  contact: {
    id: string
    firstName: string | null
    lastName: string | null
    enrichmentStatus: string
    linkedinUrl: string | null  // User-provided, skip search if present
  }
  place: {
    website: string | null
    name: string | null
  }
  userPlaceId: string
}

/**
 * Get enrichment context for a manual (user-created) contact.
 * Returns null if contact has an officerId.
 */
export const getManualContactEnrichmentContext = async (
  contactId: string
): Promise<ManualContactEnrichmentContext | null> => {
  const result = await db
    .select({
      contact: {
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        officerId: contact.officerId,
        enrichmentStatus: contact.enrichmentStatus,
        linkedinUrl: contact.linkedinUrl,
      },
      userPlaceId: userPlace.id,
      place: {
        website: place.website,
        name: place.name,
      },
    })
    .from(contact)
    .innerJoin(userPlace, eq(userPlace.id, contact.userPlaceId))
    .innerJoin(place, eq(place.id, userPlace.placeId))
    .where(eq(contact.id, contactId))
    .limit(1)

  if (!result.length) {
    return null
  }

  // Only for manual contacts (no officerId)
  if (result[0].contact.officerId) {
    return null
  }

  return {
    contact: {
      id: result[0].contact.id,
      firstName: result[0].contact.firstName,
      lastName: result[0].contact.lastName,
      enrichmentStatus: result[0].contact.enrichmentStatus,
      linkedinUrl: result[0].contact.linkedinUrl,
    },
    place: result[0].place,
    userPlaceId: result[0].userPlaceId,
  }
}
```

### 3.2 Contact LinkedIn Waterfall (New)

**File**: `apps/api/src/services/enrichment/waterfalls/contact_linkedin_waterfall.ts`

```typescript
import { db } from '../../../db/db'
import { contactLinkedin } from '../../../db/schema'

interface ContactLinkedInContext {
  readonly contactId: string
  readonly existingLinkedinUrl: string | null  // Skip search if provided
  readonly person: {
    firstName: string | null
    lastName: string | null
  }
  readonly place: {
    name: string | null
  }
  readonly userPlaceId: string
}

interface LinkedInResult {
  profileUrl: string
  confidence: number
  reasoning: string
  source: string
}

interface WaterfallResult {
  success: boolean
  source: string | null
  data: LinkedInResult | null
}

/**
 * LinkedIn waterfall for manual contacts.
 * Stores results directly in contact_linkedin table.
 */
export const runContactLinkedInWaterfall = async (
  context: ContactLinkedInContext,
  confidenceThreshold = 60,
): Promise<WaterfallResult> => {
  const { contactId, existingLinkedinUrl, person, place } = context

  // If LinkedIn URL already provided, use it directly (skip search)
  if (existingLinkedinUrl) {
    const result: LinkedInResult = {
      profileUrl: existingLinkedinUrl,
      confidence: 100,
      reasoning: 'User-provided LinkedIn URL',
      source: 'user',
    }

    await db
      .insert(contactLinkedin)
      .values({
        contactId,
        profileUrl: result.profileUrl,
        confidence: result.confidence,
        reasoning: result.reasoning,
        source: result.source,
      })
      .onConflictDoNothing()

    return { success: true, source: 'user', data: result }
  }

  // Validate person has name for search
  if (!person.firstName || !person.lastName) {
    return { success: false, source: null, data: null }
  }

  // Run LinkedIn providers (reuse existing provider logic)
  // Note: No company data available for manual contacts
  const result = await runLinkedInProviders({
    firstName: person.firstName,
    lastName: person.lastName,
    placeName: place.name,
    confidenceThreshold,
  })

  if (!result?.profileUrl) {
    return { success: false, source: null, data: null }
  }

  // Store in contact_linkedin table
  await db
    .insert(contactLinkedin)
    .values({
      contactId,
      profileUrl: result.profileUrl,
      confidence: result.confidence,
      reasoning: result.reasoning,
      source: result.source,
    })
    .onConflictDoNothing()

  return { success: true, source: result.source, data: result }
}

// Helper to run LinkedIn providers without company context
const runLinkedInProviders = async (params: {
  firstName: string
  lastName: string
  placeName: string | null
  confidenceThreshold: number
}): Promise<LinkedInResult | null> => {
  // Implement provider calls here (BrightData, etc.)
  // Similar to existing runProviders but without company data
  // Return null if no results meet threshold
  return null // Placeholder
}
```

### 3.3 Contact Email Waterfall (New)

**File**: `apps/api/src/services/enrichment/waterfalls/contact_email_waterfall.ts`

```typescript
import { db } from '../../../db/db'
import { contactEmail } from '../../../db/schema'

interface ContactEmailContext {
  readonly contactId: string
  readonly person: {
    firstName: string | null
    lastName: string | null
  }
  readonly website: string | null
  readonly userPlaceId: string
}

interface EmailResult {
  email: string
  isVerified: boolean
  source: string
  quality: string | null
  result: string | null
  isRole: boolean
  isFree: boolean
}

interface WaterfallResult {
  success: boolean
  source: string | null
  data: EmailResult[] | null
}

/**
 * Email waterfall for manual contacts.
 * Stores results directly in contact_email table.
 */
export const runContactEmailWaterfall = async (
  context: ContactEmailContext,
): Promise<WaterfallResult> => {
  const { contactId, person, website } = context

  // Validate person has name
  if (!person.firstName || !person.lastName) {
    return { success: false, source: null, data: null }
  }

  // Extract domain from website
  const domain = website ? extractDomain(website) : null
  if (!domain) {
    return { success: false, source: null, data: null }
  }

  // Run email enrichment (reuse existing provider logic)
  const emails = await enrichEmail({
    firstName: person.firstName,
    lastName: person.lastName,
    domain,
  })

  if (emails.length === 0) {
    return { success: false, source: null, data: null }
  }

  // Store directly in contact_email table
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i]
    await db
      .insert(contactEmail)
      .values({
        contactId,
        email: email.email,
        isPrimary: i === 0,
        isVerified: email.isVerified ?? false,
        source: email.source,
        quality: email.quality,
        result: email.result,
        role: email.isRole ?? false,
        free: email.isFree ?? false,
      })
      .onConflictDoNothing()
  }

  return { success: true, source: 'icypeas', data: emails }
}

const extractDomain = (url: string): string | null => {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
    return parsed.hostname.replace('www.', '')
  } catch {
    return null
  }
}

// Placeholder - reuse existing provider
const enrichEmail = async (params: {
  firstName: string
  lastName: string
  domain: string
}): Promise<EmailResult[]> => {
  return [] // Implement with existing icypeas logic
}
```

### 3.4 Contact Phone Waterfall (New)

**File**: `apps/api/src/services/enrichment/waterfalls/contact_phone_waterfall.ts`

```typescript
import { db } from '../../../db/db'
import { contactPhone } from '../../../db/schema'

interface ContactPhoneContext {
  readonly contactId: string
  readonly person: {
    firstName: string | null
    lastName: string | null
  }
  readonly userPlaceId: string
}

interface PhoneResult {
  phone: string
  type: string
  source: string
}

interface WaterfallResult {
  success: boolean
  source: string | null
  data: PhoneResult[] | null
}

/**
 * Phone waterfall for manual contacts.
 * Stores results directly in contact_phone table.
 */
export const runContactPhoneWaterfall = async (
  context: ContactPhoneContext,
): Promise<WaterfallResult> => {
  const { contactId, person } = context

  // Validate person has name
  if (!person.firstName || !person.lastName) {
    return { success: false, source: null, data: null }
  }

  // Run phone enrichment (reuse existing provider logic)
  const phones = await enrichPhone({
    firstName: person.firstName,
    lastName: person.lastName,
  })

  if (phones.length === 0) {
    return { success: false, source: null, data: null }
  }

  // Store directly in contact_phone table
  for (let i = 0; i < phones.length; i++) {
    const phone = phones[i]
    await db
      .insert(contactPhone)
      .values({
        contactId,
        phone: phone.phone,
        type: phone.type ?? 'FIXED_LINE_OR_MOBILE',
        isPrimary: i === 0,
      })
      .onConflictDoNothing()
  }

  return { success: true, source: phones[0]?.source ?? null, data: phones }
}

// Placeholder - reuse existing provider
const enrichPhone = async (params: {
  firstName: string
  lastName: string
}): Promise<PhoneResult[]> => {
  return [] // Implement with existing logic
}
```

### 3.5 Enrich Manual Contact Orchestrator

**File**: `apps/api/src/services/enrichment/enrich_manual_contact.ts`

```typescript
import { eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { contact } from '../../db/schema'
import { getManualContactEnrichmentContext } from './queries/get_manual_contact_enrichment_context'
import { runContactLinkedInWaterfall } from './waterfalls/contact_linkedin_waterfall'
import { runContactEmailWaterfall } from './waterfalls/contact_email_waterfall'
import { runContactPhoneWaterfall } from './waterfalls/contact_phone_waterfall'

interface EnrichManualContactParams {
  contactId: string
  userPlaceId: string
}

interface EnrichManualContactResult {
  success: boolean
  contactId: string
  linkedinFound: boolean
  emailsFound: number
  phonesFound: number
}

/**
 * Enriches a manual (user-created) contact.
 * Stores data directly in contact_* tables.
 * No population step needed.
 */
export const enrichManualContact = async ({
  contactId,
  userPlaceId,
}: EnrichManualContactParams): Promise<EnrichManualContactResult> => {
  // Get manual contact context
  const context = await getManualContactEnrichmentContext(contactId)
  if (!context) {
    throw new Error('Contact not found or is an officer contact')
  }

  // Check if already enriched
  if (context.contact.enrichmentStatus === 'completed') {
    return {
      success: true,
      contactId,
      linkedinFound: false,
      emailsFound: 0,
      phonesFound: 0,
    }
  }

  // Mark as processing
  await db
    .update(contact)
    .set({ enrichmentStatus: 'processing' })
    .where(eq(contact.id, contactId))

  const person = {
    firstName: context.contact.firstName,
    lastName: context.contact.lastName,
  }

  let linkedinFound = false
  let emailsFound = 0
  let phonesFound = 0

  try {
    // 1. LinkedIn enrichment → contact_linkedin (skips if linkedinUrl provided)
    const linkedinResult = await runContactLinkedInWaterfall({
      contactId,
      existingLinkedinUrl: context.contact.linkedinUrl,
      person,
      place: context.place,
      userPlaceId,
    })
    linkedinFound = linkedinResult.success

    // 2. Email enrichment → contact_email
    const emailResult = await runContactEmailWaterfall({
      contactId,
      person,
      website: context.place.website,
      userPlaceId,
    })
    emailsFound = emailResult.data?.length ?? 0

    // 3. Phone enrichment → contact_phone
    const phoneResult = await runContactPhoneWaterfall({
      contactId,
      person,
      userPlaceId,
    })
    phonesFound = phoneResult.data?.length ?? 0

    // Mark as completed
    await db
      .update(contact)
      .set({
        enrichmentStatus: 'completed',
        enrichedAt: new Date(),
      })
      .where(eq(contact.id, contactId))

    return {
      success: true,
      contactId,
      linkedinFound,
      emailsFound,
      phonesFound,
    }
  } catch (error) {
    // Mark as failed
    await db
      .update(contact)
      .set({ enrichmentStatus: 'failed' })
      .where(eq(contact.id, contactId))

    throw error
  }
}
```

---

## Phase 4: Unified Entry Point

A single entry point that routes to the correct flow:

**File**: `apps/api/src/services/enrichment/enrich_contact.ts`

```typescript
import { eq } from 'drizzle-orm'
import { db } from '../../db/db'
import { contact } from '../../db/schema'
import { enrichOfficerContact } from './enrich_officer_contact'
import { enrichManualContact } from './enrich_manual_contact'

interface EnrichContactParams {
  contactId: string
  userPlaceId: string
}

interface EnrichContactResult {
  success: boolean
  contactId: string
  linkedinFound: boolean
  emailsFound: number
  phonesFound: number
  type: 'officer' | 'manual'
}

/**
 * Unified entry point for contact enrichment.
 * Routes to appropriate flow based on contact type.
 */
export const enrichContact = async ({
  contactId,
  userPlaceId,
}: EnrichContactParams): Promise<EnrichContactResult> => {
  // Check if contact has officerId
  const [contactRow] = await db
    .select({ officerId: contact.officerId })
    .from(contact)
    .where(eq(contact.id, contactId))
    .limit(1)

  if (!contactRow) {
    throw new Error('Contact not found')
  }

  if (contactRow.officerId) {
    // Officer contact → use officer flow
    const result = await enrichOfficerContact({ contactId, userPlaceId })
    return { ...result, type: 'officer' }
  } else {
    // Manual contact → use manual flow
    const result = await enrichManualContact({ contactId, userPlaceId })
    return { ...result, type: 'manual' }
  }
}
```

---

## Data Flow Summary

### Officer Contact (Pappers)

```
1. Company enrichment
   └── Creates enrichment_company_officer records

2. createContactsFromOfficers()
   └── Creates contact with officerId FK

3. enrichOfficerContact({ contactId })
   ├── runLinkedInWaterfall() → enrichment_company_officer_linkedin
   ├── runEmailWaterfallWithData() → enrichment_company_officer_email
   └── runPhoneWaterfall() → enrichment_company_officer_phone

4. populateContactFromEnrichment() (existing)
   └── Copies from officer tables → contact_* tables
```

### Manual Contact (User-Created)

```
1. User creates contact manually
   └── contact record with officerId = null, linkedinUrl = optional

2. enrichManualContact({ contactId })
   ├── runContactLinkedInWaterfall() → contact_linkedin
   │   └── Skips search if linkedinUrl already provided
   ├── runContactEmailWaterfall() → contact_email
   └── runContactPhoneWaterfall() → contact_phone

3. No population step needed (data already in contact_* tables)
```

---

## Files Summary

### New Files (9)

| File | Description |
|------|-------------|
| `apps/api/src/services/contact/create_contacts_from_officers.ts` | Creates contacts from officers before enrichment |
| `apps/api/src/services/enrichment/queries/get_officer_enrichment_context.ts` | Context query for officer contacts |
| `apps/api/src/services/enrichment/queries/get_manual_contact_enrichment_context.ts` | Context query for manual contacts |
| `apps/api/src/services/enrichment/enrich_contact.ts` | Unified entry point - routes to appropriate flow |
| `apps/api/src/services/enrichment/enrich_officer_contact.ts` | Officer contact enrichment orchestrator |
| `apps/api/src/services/enrichment/enrich_manual_contact.ts` | Manual contact enrichment orchestrator |
| `apps/api/src/services/enrichment/waterfalls/contact_linkedin_waterfall.ts` | LinkedIn waterfall for manual contacts |
| `apps/api/src/services/enrichment/waterfalls/contact_email_waterfall.ts` | Email waterfall for manual contacts |
| `apps/api/src/services/enrichment/waterfalls/contact_phone_waterfall.ts` | Phone waterfall for manual contacts |

### Files to Modify (2)

| File | Changes |
|------|---------|
| `apps/api/src/db/schema/contact.ts` | Add `enrichedAt`, `enrichmentStatus`, `linkedinUrl` columns + `contactLinkedin` table |
| `apps/api/src/db/migrations/XXXX_add_contact_enrichment.sql` | Migration for new columns and table |

### Files Unchanged

| File | Reason |
|------|--------|
| `apps/api/src/services/enrichment/governmental_data/waterfalls/*` | Officer waterfalls remain unchanged |
| `apps/api/src/services/contact/populate_contact_from_enrichment.ts` | Still needed for officer contacts |
| `apps/api/src/services/contact/populate_officer_contacts_from_enrichment.ts` | Still needed for officer contacts |
| `enrichment_company_officer_*` tables | Still used for officer contacts |

---

## Benefits of Separation

1. **Single Responsibility** - Each function does one thing
2. **No Conditional Branching** - Waterfalls don't have `if (officerId)` checks
3. **Easier Testing** - Test officer and manual flows independently
4. **Clearer Data Flow** - Each flow has its own predictable path
5. **Extensibility** - Can add manual-specific logic without affecting officer flow
6. **Debugging** - Easier to trace issues in isolated flows

---

## Next Steps

After this refactor:
1. Implement worker separation (company vs contact workers)
2. Add new credit model (1 credit company, 5 credits per contact)
3. Add per-contact enrichment API endpoint
