import { logger } from '@ritchy/logger'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../../../../db/db'
import { contactPhone } from '../../../../../db/schema'
import type * as schema from '../../../../../db/schema'

interface ContactPhoneContext {
  readonly contactId: string
  readonly person: {
    firstName: string | null
    lastName: string | null
  }
}

interface PhoneResult {
  phone: string
  type: 'FIXED_LINE_OR_MOBILE'
  source: string
}

interface ContactPhoneWaterfallResult {
  readonly success: boolean
  readonly phonesFound: number
  readonly phones: readonly string[]
  readonly providersUsed: readonly string[]
}

/**
 * Phone waterfall for manual contacts.
 * Stores results directly in contact_phone table.
 *
 * Note: Phone enrichment for manual contacts is limited because:
 * - Forager requires LinkedIn profile (which may not exist)
 * - ContactOut requires full name + company context
 *
 * For now, this returns empty results. Future implementations could:
 * - Use LinkedIn profile from contact_linkedin if available
 * - Integrate additional phone providers
 */
export const runContactPhoneWaterfall = async (
  context: ContactPhoneContext,
): Promise<ContactPhoneWaterfallResult> => {
  const { contactId, person } = context

  // Validate person has name
  if (!person.firstName || !person.lastName) {
    logger.debug({
      msg: '[contact_phone_waterfall] Skipping - missing name',
      event: 'contact_phone_skipped_no_name',
      metadata: { contactId },
    })

    return {
      success: false,
      phonesFound: 0,
      phones: [],
      providersUsed: [],
    }
  }

  logger.info({
    msg: '[contact_phone_waterfall] Starting phone waterfall for manual contact',
    event: 'contact_phone_waterfall_start',
    metadata: {
      contactId,
      personName: `${person.firstName} ${person.lastName}`,
    },
  })

  // TODO: Implement phone providers for manual contacts
  // Currently, phone enrichment requires LinkedIn profile (Forager)
  // or full company context (ContactOut), neither of which are
  // available for manual contacts without prior enrichment.
  //
  // Future options:
  // 1. Query contact_linkedin table for LinkedIn URL, then use Forager
  // 2. Add new phone providers that work with name + place only

  logger.info({
    msg: '[contact_phone_waterfall] No phone providers available for manual contacts',
    event: 'contact_phone_waterfall_no_providers',
    metadata: { contactId },
  })

  return {
    success: false,
    phonesFound: 0,
    phones: [],
    providersUsed: [],
  }
}

/**
 * Insert phones found into contact_phone table
 * Utility for future phone provider implementations
 */
export const insertContactPhonesFromWaterfall = async (
  contactId: string,
  phones: PhoneResult[],
  tx?: PostgresJsDatabase<typeof schema>,
) => {
  const database = tx ?? db

  if (phones.length === 0) return

  for (let i = 0; i < phones.length; i++) {
    const phone = phones[i]
    await database
      .insert(contactPhone)
      .values({
        contactId,
        phone: phone.phone,
        type: phone.type,
        isPrimary: i === 0,
      })
      .onConflictDoNothing()
  }
}
