import { logger } from '@ritchy/logger'
import type { EnrichResponse } from '@ritchy/types'
import { and, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../db/db'
import { contactEmail, contactSocial } from '../../db/schema'
import type * as schema from '../../db/schema'
import { extractSocialPlatformFromUrl } from './utils/extractSocialPlatformFromUrl'

interface SaveEnrichmentDataOptions {
  contactId: string
  enrichmentData: EnrichResponse
  source?: 'enrichment' | 'manual' | 'third_party'
}

interface EmailProcessResult {
  emailsSaved: number
  emailsDeduplicated: number
  primaryEmailSet: boolean
}

interface SocialProcessResult {
  socialLinksSaved: number
  socialLinksDeduplicated: number
  primarySocialSet: boolean
}

/**
 * Saves enrichment data (emails and social profiles) to the database
 * with smart merging rules and deduplication
 */
export async function saveEnrichmentData({
  contactId,
  enrichmentData,
  source = 'enrichment',
}: SaveEnrichmentDataOptions): Promise<{
  emailResults: EmailProcessResult
  socialResults: SocialProcessResult
}> {
  const { emails, socialLinks } = enrichmentData

  // Flatten socialLinks object to array of URLs
  const flattenedSocialLinks = Object.values(socialLinks).flat()

  logger.info({
    msg: 'Starting enrichment data save',
    event: 'enrichment_data_save_start',
    metadata: {
      contactId,
      emailsCount: emails.length,
      socialLinksCount: flattenedSocialLinks.length,
      source,
    },
  })

  // Use transaction for atomic operations
  const result = await db.transaction(async (tx) => {
    const emailResults = await processEmailsWithTransaction(
      contactId,
      emails,
      source,
      tx,
    )
    const socialResults = await processSocialsWithTransaction(
      contactId,
      flattenedSocialLinks,
      source,
      tx,
    )

    return {
      emailResults,
      socialResults,
    }
  })

  logger.info({
    msg: 'Enrichment data save completed',
    event: 'enrichment_data_save_complete',
    metadata: {
      contactId,
      emailResults: result.emailResults,
      socialResults: result.socialResults,
    },
  })

  return result
}

async function processEmailsWithTransaction(
  contactId: string,
  emails: string[],
  source: string,
  tx: PostgresJsDatabase<typeof schema>,
): Promise<EmailProcessResult> {
  const existingEmails = await tx.query.contactEmail.findMany({
    where: eq(contactEmail.contactId, contactId),
  })

  const existingPrimary = await tx.query.contactEmail.findFirst({
    where: and(
      eq(contactEmail.contactId, contactId),
      eq(contactEmail.isPrimary, true),
    ),
  })

  // simple validation for emails
  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const validEmails = emails.filter(isValidEmail)

  const newEmails = validEmails.filter(
    (email) => !existingEmails.some((e) => e.email === email),
  )

  const emailsDeduplicated = validEmails.length - newEmails.length

  if (newEmails.length === 0) {
    return {
      emailsSaved: 0,
      emailsDeduplicated,
      primaryEmailSet: false,
    }
  }

  // Case 1: No primary email exists - first new email becomes primary
  if (!existingPrimary) {
    // we slice the first email as the primary and the rest as secondary
    const [primaryEmail, ...secondaryEmails] = newEmails

    // Insert primary email
    await tx.insert(contactEmail).values({
      contactId,
      email: primaryEmail,
      isPrimary: true,
      source,
    })

    // Insert secondary emails (if any)
    if (secondaryEmails.length > 0) {
      await tx.insert(contactEmail).values(
        secondaryEmails.map((email) => ({
          contactId,
          email,
          isPrimary: false,
          source,
        })),
      )
    }

    return {
      emailsSaved: newEmails.length,
      emailsDeduplicated,
      primaryEmailSet: true,
    }
  }

  // Case 2: Primary email exists - all new emails become secondary
  await tx.insert(contactEmail).values(
    newEmails.map((email) => ({
      contactId,
      email,
      isPrimary: false,
      source,
    })),
  )

  return {
    emailsSaved: newEmails.length,
    emailsDeduplicated,
    primaryEmailSet: false,
  }
}

async function processSocialsWithTransaction(
  contactId: string,
  socialLinks: string[],
  source: string,
  tx: PostgresJsDatabase<typeof schema>,
): Promise<SocialProcessResult> {
  const existingSocialLinks = await tx.query.contactSocial.findMany({
    where: eq(contactSocial.contactId, contactId),
  })

  const existingPrimary = await tx.query.contactSocial.findFirst({
    where: and(
      eq(contactSocial.contactId, contactId),
      eq(contactSocial.isPrimary, true),
    ),
  })

  const newSocials = socialLinks.filter(
    (link) => !existingSocialLinks.some((e) => e.profileUrl === link),
  )

  const socialLinksDeduplicated = socialLinks.length - newSocials.length

  if (newSocials.length === 0) {
    return {
      socialLinksSaved: 0,
      socialLinksDeduplicated,
      primarySocialSet: false,
    }
  }

  if (!existingPrimary) {
    // we slice the first social as the primary and the rest as secondary
    const [primarySocial, ...secondarySocials] = newSocials

    // Insert primary social
    await tx.insert(contactSocial).values({
      contactId,
      platform: extractSocialPlatformFromUrl(primarySocial),
      profileUrl: primarySocial,
      isPrimary: true,
      source,
    })

    // Insert secondary social links (if any)
    if (secondarySocials.length > 0) {
      await tx.insert(contactSocial).values(
        secondarySocials.map((social) => ({
          contactId,
          platform: extractSocialPlatformFromUrl(social),
          profileUrl: social,
          isPrimary: false,
          source,
        })),
      )
    }

    return {
      socialLinksSaved: newSocials.length,
      socialLinksDeduplicated,
      primarySocialSet: true,
    }
  }

  // Case 2: Primary social exists - all new socials become secondary
  await tx.insert(contactSocial).values(
    newSocials.map((social) => ({
      contactId,
      platform: extractSocialPlatformFromUrl(social),
      profileUrl: social,
      isPrimary: false,
      source,
    })),
  )

  return {
    socialLinksSaved: newSocials.length,
    socialLinksDeduplicated,
    primarySocialSet: false,
  }
}
