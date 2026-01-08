import { logger } from '@ritchy/logger'

export interface OfficerRecord {
  id: string
  company_id: string
  type: string | null
  first_name: string | null
  last_name: string | null
  role?: string | null
  date_of_appointment?: Date | null
  date_of_birth?: Date | null
  gender?: string | null
  nationality?: string | null
  address_line_1?: string | null
  city?: string | null
  country?: string | null
}

export interface ValidatedOfficerData {
  id: string
  firstName: string
  lastName: string
  fullName: string
  role?: string | null
  date_of_appointment?: Date | null
  date_of_birth?: Date | null
  gender?: string | null
  nationality?: string | null
  address_line_1?: string | null
  city?: string | null
  country?: string | null
}

export type ValidationSkipReason =
  | 'legal_entity'
  | 'no_name'
  | 'incomplete_name'

export interface ValidationResult {
  readonly valid: false
  readonly reason: ValidationSkipReason
  readonly officerId: string
}

export interface ValidationSuccess {
  readonly valid: true
  readonly data: ValidatedOfficerData
}

export type OfficerValidation = ValidationResult | ValidationSuccess

/**
 * Validates and prepares officer data for enrichment
 * Returns validated data or a reason why the officer should be skipped
 *
 * @param officer - Officer record from database
 * @param waterfall - Waterfall name for logging (e.g., 'linkedin', 'email')
 * @returns Validation result with data or skip reason
 */
export const validateOfficerForEnrichment = (
  officer: OfficerRecord | null,
  waterfall: string,
): OfficerValidation => {
  if (!officer) {
    logger.warn({
      msg: `[${waterfall}_waterfall] Officer not found`,
      event: `${waterfall}_waterfall_officer_not_found`,
    })
    return {
      valid: false,
      reason: 'no_name',
      officerId: 'unknown',
    }
  }

  // Skip legal entities (only enrich physical persons)
  if (officer.type === 'legal') {
    logger.debug({
      msg: `[${waterfall}_waterfall] Skipping enrichment for legal entity`,
      event: `${waterfall}_waterfall_skipped_legal`,
      metadata: {
        officerId: officer.id,
      },
    })
    return {
      valid: false,
      reason: 'legal_entity',
      officerId: officer.id,
    }
  }

  // Check if officer has any name
  if (!officer.first_name && !officer.last_name) {
    logger.debug({
      msg: `[${waterfall}_waterfall] Skipping enrichment for officer without name`,
      event: `${waterfall}_waterfall_skipped_no_name`,
      metadata: {
        officerId: officer.id,
      },
    })
    return {
      valid: false,
      reason: 'no_name',
      officerId: officer.id,
    }
  }

  // Parse and clean names
  const firstName = officer.first_name?.split(',')[0]?.trim() ?? ''
  const lastName = officer.last_name ?? ''

  // Validate both names are present
  if (!firstName || !lastName) {
    logger.debug({
      msg: `[${waterfall}_waterfall] Skipping enrichment due to missing first or last name`,
      event: `${waterfall}_waterfall_skipped_incomplete_name`,
      metadata: {
        officerId: officer.id,
        hasFirstName: !!firstName,
        hasLastName: !!lastName,
      },
    })
    return {
      valid: false,
      reason: 'incomplete_name',
      officerId: officer.id,
    }
  }

  // Return validated data
  return {
    valid: true,
    data: {
      id: officer.id,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      role: officer.role,
      date_of_appointment: officer.date_of_appointment,
      date_of_birth: officer.date_of_birth,
      gender: officer.gender,
      nationality: officer.nationality,
      address_line_1: officer.address_line_1,
      city: officer.city,
      country: officer.country,
    },
  }
}
