import { logger } from '@ritchy/logger'
import type { EnrichResponse } from '@ritchy/types'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { db } from '../../db/db'
import type * as schema from '../../db/schema'
import {
  get_contact_emails,
  get_primary_contact_email,
} from '../contact/queries'
import {
  get_contact_socials,
  get_primary_contact_social,
} from '../contact/queries'
import { insert_contact_emails_with_transaction } from '../contact/queries'
import { insert_contact_socials_with_transaction } from '../contact/queries'
import { extractSocialPlatformFromUrl } from '../contact/utils/extract_social_platform_from_url'
import { validate_emails } from '../contact/validators/validate_emails'
import { validate_socials } from '../contact/validators/validate_socials'

interface SaveEnrichmentDataOptions {
  contactId: string
  enrichmentData: EnrichResponse
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
    },
  })

  // Use transaction for atomic operations
  const result = await db.transaction(async (tx) => {
    const emailResults = await processEmailsWithTransaction(
      contactId,
      emails,
      tx,
    )
    const socialResults = await processSocialsWithTransaction(
      contactId,
      flattenedSocialLinks,
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
  emailList: string[],
  tx: PostgresJsDatabase<typeof schema>,
): Promise<EmailProcessResult> {
  // validate incoming new emails
  const validEmails = validate_emails(emailList)

  logger.info({
    msg: 'Email processing',
    event: 'email_processing',
    metadata: {
      contactId,
      totalEmails: emailList.length,
      validEmails: validEmails.length,
    },
  })

  // Use non-transaction queries for reads
  const existingEmails = await get_contact_emails(contactId)
  const existingPrimary = await get_primary_contact_email(contactId)

  // Deduplication logic
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

  // Create all emails as secondary first (consistent structure)
  const emails = newEmails.map((email) => ({
    contactId,
    email,
    isPrimary: false,
    source: 'enrichment',
  }))

  // Case 1: No primary email exists - first new email received becomes primary
  if (!existingPrimary) {
    const [primaryEmail, ...secondaryEmails] = emails

    // Prepare email data for insertion
    const emailsToInsert = [
      {
        ...primaryEmail,
        isPrimary: true,
      },
      ...secondaryEmails,
    ]

    // Use transaction-aware insert function
    await insert_contact_emails_with_transaction(tx, emailsToInsert)

    return {
      emailsSaved: newEmails.length,
      emailsDeduplicated,
      primaryEmailSet: true,
    }
  }

  // Case 2: Primary email exists - all new emails become secondary
  await insert_contact_emails_with_transaction(tx, emails)

  return {
    emailsSaved: newEmails.length,
    emailsDeduplicated,
    primaryEmailSet: false,
  }
}

async function processSocialsWithTransaction(
  contactId: string,
  socialLinkList: string[],
  tx: PostgresJsDatabase<typeof schema>,
): Promise<SocialProcessResult> {
  // validate incoming social links
  const validSocials = validate_socials(socialLinkList)

  // Additional business metrics
  const platformsFound = [
    ...new Set(validSocials.map((url) => extractSocialPlatformFromUrl(url))),
  ]

  logger.info({
    msg: 'Social media analysis',
    event: 'social_analysis',
    metadata: {
      contactId,
      totalSocials: socialLinkList.length,
      validSocials: validSocials.length,
      platformsFound,
    },
  })

  // Use non-transaction queries for reads
  const existingSocials = await get_contact_socials(contactId)
  const existingPrimary = await get_primary_contact_social(contactId)

  // Deduplication logic
  const newSocials = validSocials.filter(
    (url) => !existingSocials.some((s) => s.profileUrl === url),
  )

  const socialLinksDeduplicated = validSocials.length - newSocials.length

  if (newSocials.length === 0) {
    return {
      socialLinksSaved: 0,
      socialLinksDeduplicated,
      primarySocialSet: false,
    }
  }

  // Create all socials as secondary first (consistent structure)
  const socials = newSocials.map((url) => ({
    contactId,
    platform: extractSocialPlatformFromUrl(url),
    profileUrl: url,
    isPrimary: false,
    source: 'enrichment',
  }))

  // Case 1: No primary social exists - first new social becomes primary
  if (!existingPrimary) {
    const [primarySocial, ...secondarySocials] = socials

    // Prepare social data for insertion
    const socialsToInsert = [
      {
        ...primarySocial,
        isPrimary: true,
        source: 'enrichment',
      },
      ...secondarySocials,
    ]

    // Use transaction-aware insert function
    await insert_contact_socials_with_transaction(tx, socialsToInsert)

    return {
      socialLinksSaved: newSocials.length,
      socialLinksDeduplicated,
      primarySocialSet: true,
    }
  }

  // Case 2: Primary social exists - all new socials become secondary
  await insert_contact_socials_with_transaction(tx, socials)

  return {
    socialLinksSaved: newSocials.length,
    socialLinksDeduplicated,
    primarySocialSet: false,
  }
}
