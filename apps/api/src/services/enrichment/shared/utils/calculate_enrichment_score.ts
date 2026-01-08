import { logger } from '@ritchy/logger'
import { eq } from 'drizzle-orm'
import { db } from '../../../../db/db'
import {
  enrichment,
  enrichmentCompany,
  enrichmentCompanyOfficer,
  enrichmentCompanyOfficerEmail,
  enrichmentCompanyOfficerLinkedin,
  enrichmentCompanyOfficerPhone,
  enrichmentPhone,
} from '../../../../db/schema'

/**
 * Calculate enrichment quality score (0-100) based primarily on:
 * - Company data quality and completeness (REQUIRED - score is 0 without company data)
 * - Presence of physical officers with contact info
 * - Phone type quality (mobile > fixed line > other)
 * - Email quality (personal non-free > personal free > role emails)
 * - LinkedIn profile presence
 *
 * Score prioritizes company data quality. Without company data, score is 0.
 *
 * Scoring breakdown (max 110 points, capped at 100):
 * - Base company: 15 points + up to 15 bonus (confidence, status, workforce, age)
 * - Officers: 10 points + up to 10 bonus (5 per officer, max 2)
 * - Phone numbers: up to 35 points (25 for mobile, 15 for mobile/fixed, 10 for fixed)
 * - Email addresses: up to 20 points (15 personal non-free, 10 personal free, 5 role)
 * - LinkedIn profiles: up to 5 points (high-confidence profiles)
 *
 * @param enrichmentId - The enrichment record ID
 * @returns Score from 0-100 (null if enrichment not found, 0 if no company data)
 */
export const calculateEnrichmentScore = async (
  enrichmentId: string,
): Promise<number | null> => {
  try {
    // Single query to fetch all enrichment data with JOINs
    const enrichmentData = await db
      .select({
        // Company fields
        companyId: enrichmentCompany.id,
        companyConfidence: enrichmentCompany.confidence_score,
        companyStatus: enrichmentCompany.status,
        companyWorkforce: enrichmentCompany.workforce,
        companyWorkforceRange: enrichmentCompany.workforce_range,
        companyDateOfCreation: enrichmentCompany.date_of_creation,
        // Officer fields
        officerId: enrichmentCompanyOfficer.id,
        officerType: enrichmentCompanyOfficer.type,
        officerFirstName: enrichmentCompanyOfficer.first_name,
        officerLastName: enrichmentCompanyOfficer.last_name,
        // Phone fields
        phoneId: enrichmentCompanyOfficerPhone.id,
        phoneNumber: enrichmentCompanyOfficerPhone.phone,
        // Email fields
        emailId: enrichmentCompanyOfficerEmail.id,
        emailAddress: enrichmentCompanyOfficerEmail.email,
        emailQuality: enrichmentCompanyOfficerEmail.quality,
        emailResult: enrichmentCompanyOfficerEmail.result,
        emailRole: enrichmentCompanyOfficerEmail.role,
        emailFree: enrichmentCompanyOfficerEmail.free,
        // LinkedIn fields
        linkedinId: enrichmentCompanyOfficerLinkedin.id,
        linkedinConfidence: enrichmentCompanyOfficerLinkedin.confidence,
      })
      .from(enrichment)
      .leftJoin(
        enrichmentCompany,
        eq(enrichmentCompany.enrichment_id, enrichment.id),
      )
      .leftJoin(
        enrichmentCompanyOfficer,
        eq(enrichmentCompanyOfficer.company_id, enrichmentCompany.id),
      )
      .leftJoin(
        enrichmentCompanyOfficerPhone,
        eq(
          enrichmentCompanyOfficerPhone.officer_id,
          enrichmentCompanyOfficer.id,
        ),
      )
      .leftJoin(
        enrichmentCompanyOfficerEmail,
        eq(
          enrichmentCompanyOfficerEmail.officer_id,
          enrichmentCompanyOfficer.id,
        ),
      )
      .leftJoin(
        enrichmentCompanyOfficerLinkedin,
        eq(
          enrichmentCompanyOfficerLinkedin.officer_id,
          enrichmentCompanyOfficer.id,
        ),
      )
      .where(eq(enrichment.id, enrichmentId))

    if (!enrichmentData || enrichmentData.length === 0) {
      logger.warn({
        msg: '[calculateEnrichmentScore] Enrichment not found for score calculation',
        event: 'enrichment_score_not_found',
        metadata: { enrichmentId },
      })
      return null
    }

    // Company data is required - return 0 if missing
    if (!enrichmentData[0].companyId) {
      logger.info({
        msg: '[calculateEnrichmentScore] No company data found - returning score 0',
        event: 'enrichment_score_no_company_data',
        metadata: { enrichmentId },
      })
      return 0
    }

    // Fetch company-level phones (not officer-specific)
    const companyPhones = await db
      .select()
      .from(enrichmentPhone)
      .where(eq(enrichmentPhone.enrichmentId, enrichmentId))

    // Aggregate data from joined results
    const uniqueOfficers = new Map<
      string,
      {
        id: string
        type: string | null
        firstName: string | null
        lastName: string | null
      }
    >()
    const uniquePhones = new Map<string, string>()
    const uniqueEmails = new Map<
      string,
      {
        id: string
        quality: string | null
        result: string | null
        role: boolean
        free: boolean
      }
    >()
    const uniqueLinkedins = new Set<string>()
    let highConfidenceLinkedinCount = 0

    for (const row of enrichmentData) {
      // Collect unique officers
      if (
        row.officerId &&
        row.officerType === 'physical' &&
        row.officerFirstName &&
        row.officerLastName
      ) {
        uniqueOfficers.set(row.officerId, {
          id: row.officerId,
          type: row.officerType,
          firstName: row.officerFirstName,
          lastName: row.officerLastName,
        })
      }

      // Collect unique phones (officer-level)
      if (row.phoneId && row.phoneNumber) {
        uniquePhones.set(row.phoneId, row.phoneNumber)
      }

      // Collect unique emails with quality data
      if (row.emailId && row.emailAddress) {
        uniqueEmails.set(row.emailId, {
          id: row.emailId,
          quality: row.emailQuality,
          result: row.emailResult,
          role: row.emailRole ?? false,
          free: row.emailFree ?? false,
        })
      }

      // Collect unique LinkedIn profiles
      if (row.linkedinId) {
        uniqueLinkedins.add(row.linkedinId)
        if (row.linkedinConfidence && row.linkedinConfidence > 80) {
          highConfidenceLinkedinCount++
        }
      }
    }

    const validOfficerCount = uniqueOfficers.size
    const phoneCount = uniquePhones.size + companyPhones.length
    const emailCount = uniqueEmails.size

    // START SCORING

    // 1. Base Company Score (30 max)
    let score = 15 // Base for having company

    // Company quality bonuses
    const companyData = enrichmentData[0]
    if (companyData.companyConfidence && companyData.companyConfidence > 80) {
      score += 5
    }
    if (companyData.companyStatus === 'active') {
      score += 5
    }
    if (companyData.companyWorkforce || companyData.companyWorkforceRange) {
      score += 3
    }
    if (companyData.companyDateOfCreation) {
      const ageYears =
        (Date.now() - new Date(companyData.companyDateOfCreation).getTime()) /
        (1000 * 60 * 60 * 24 * 365)
      if (ageYears > 2) {
        score += 2
      }
    }

    // 2. Officers Score (20 max)
    if (validOfficerCount > 0) {
      score += 10 // Base for having officers
      score += Math.min(validOfficerCount * 5, 10) // Up to 10 bonus (5 per officer, max 2)
    }

    // 3. Phone Score (35 max - HIGHEST PRIORITY)
    // For simplicity, treating all phones equally since officer phones don't have type
    // In practice, company phones have type, but officer phones are assumed to be direct contact
    if (phoneCount > 0) {
      // Officer phones are highly valuable (assumed direct/mobile)
      const officerPhoneScore = Math.min(uniquePhones.size * 25, 35)
      score += officerPhoneScore

      // Company phones add smaller value (often main lines)
      const companyPhoneScore = Math.min(companyPhones.length * 5, 10)
      score += Math.min(companyPhoneScore, 35 - officerPhoneScore) // Don't exceed 35 total
    }

    // 4. Email Score (20 max)
    let emailScore = 0
    for (const email of uniqueEmails.values()) {
      const isGoodQuality = email.quality === 'good' || email.result === 'ok'
      const isPersonal = !email.role
      const isNonFree = !email.free

      if (isGoodQuality && isPersonal && isNonFree) {
        emailScore += 15 // Best: personal non-free email
      } else if (isGoodQuality && isPersonal && email.free) {
        emailScore += 10 // Good: personal free email
      } else if (email.role) {
        emailScore += 5 // Okay: role email
      } else {
        emailScore += 2 // Minimal: unknown quality
      }
    }
    score += Math.min(emailScore, 20)

    // 5. LinkedIn Score (5 max)
    if (highConfidenceLinkedinCount > 0) {
      score += Math.min(highConfidenceLinkedinCount * 5, 5)
    }

    // Cap score at 100
    const finalScore = Math.min(score, 100)

    logger.info({
      msg: '[calculateEnrichmentScore] Enrichment score calculated',
      event: 'enrichment_score_calculated',
      metadata: {
        enrichmentId,
        score: finalScore,
        breakdown: {
          validOfficers: validOfficerCount,
          phones: phoneCount,
          emails: emailCount,
          linkedins: highConfidenceLinkedinCount,
        },
      },
    })

    return finalScore
  } catch (error) {
    logger.error({
      msg: '[calculateEnrichmentScore] Error calculating enrichment score',
      event: 'enrichment_score_calculation_error',
      metadata: {
        enrichmentId,
        error: error instanceof Error ? error.message : String(error),
      },
    })
    return null
  }
}
