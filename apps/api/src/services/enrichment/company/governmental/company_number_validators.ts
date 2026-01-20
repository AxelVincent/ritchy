import { logger } from '@ritchy/logger'
import type { z } from 'zod'
import type { PAPPERS_COUNTRY_CODES } from '../../../../external/pappers/international_company_v1'

/**
 * Supported country codes for company number validation
 * Derived from the Pappers API country codes
 */
export type SupportedCountryCode = z.infer<typeof PAPPERS_COUNTRY_CODES>

/**
 * Country-specific company number validators
 *
 * This module provides validation functions for company registration numbers
 * across European countries. Each validator follows official format specifications.
 *
 * Sources:
 * - Spain: https://rosaallegue.com/2018/06/29/cif-tax-identification-number-for-legal-entities-in-spain/
 * - France: https://en.wikipedia.org/wiki/SIRET_code
 * - UK: https://anna.money/blog/guides/company-registration-number-crn-in-the-uk-what-is-it/
 * - Belgium: https://business.belgium.be/en/managing_your_business/setting_up_your_business/main_steps/company_number
 * - Germany: https://allaboutberlin.com/guides/handelsregisternummer-germany
 * - Netherlands: https://www.kvk.nl/en/starting/kvk-number-all-you-need-to-know/
 * - Switzerland: https://www.rister.ch/en/post/swiss-business-identification-number-ide-uid-explained/
 * - Luxembourg: https://guichet.public.lu/en/entreprises/creation-developpement/constitution/entreprise-individuelle/immatriculation-entreprise-publication-rcs.html
 * - Norway: https://www.brreg.no/en/about-us-2/our-registers/about-the-central-coordinating-register-for-legal-entities-ccr/about-the-organisation-number/
 */

// ============================================================================
// Check Digit Algorithms
// ============================================================================

/**
 * Luhn algorithm (modulo 10) - Used by France (SIREN/SIRET)
 * https://en.wikipedia.org/wiki/Luhn_algorithm
 */
const isValidLuhn = (digits: string): boolean => {
  let sum = 0
  let isEven = false

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number.parseInt(digits[i], 10)

    if (isEven) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    isEven = !isEven
  }

  return sum % 10 === 0
}

/**
 * Belgian modulo 97 check digit validation
 * The last 2 digits = 97 - (first 8 digits mod 97)
 */
const isValidBelgianCheckDigit = (digits: string): boolean => {
  if (digits.length !== 10) return false

  const first8 = Number.parseInt(digits.substring(0, 8), 10)
  const checkDigits = Number.parseInt(digits.substring(8, 10), 10)
  const expectedCheck = 97 - (first8 % 97)

  return checkDigits === expectedCheck
}

/**
 * Swiss modulo 11 check digit validation (eCH-0097 standard)
 * Weights: 5, 4, 3, 2, 7, 6, 5, 4
 */
const isValidSwissCheckDigit = (digits: string): boolean => {
  if (digits.length !== 9) return false

  const weights = [5, 4, 3, 2, 7, 6, 5, 4]
  const digitArray = digits.split('').map(Number)

  const sum = digitArray
    .slice(0, 8)
    .reduce((acc, digit, i) => acc + digit * weights[i], 0)

  const remainder = sum % 11
  if (remainder === 0) return digitArray[8] === 0
  if (remainder === 1) return false // Invalid - would require check digit of 10

  return digitArray[8] === 11 - remainder
}

/**
 * Norwegian modulo 11 check digit validation
 * Weights: 3, 2, 7, 6, 5, 4, 3, 2
 */
const isValidNorwegianCheckDigit = (digits: string): boolean => {
  if (digits.length !== 9) return false

  const weights = [3, 2, 7, 6, 5, 4, 3, 2]
  const digitArray = digits.split('').map(Number)

  const sum = digitArray
    .slice(0, 8)
    .reduce((acc, digit, i) => acc + digit * weights[i], 0)

  const remainder = sum % 11
  if (remainder === 1) return false // Invalid - would require check digit of 10
  const expectedCheckDigit = remainder === 0 ? 0 : 11 - remainder

  return expectedCheckDigit === digitArray[8]
}

// ============================================================================
// Country-Specific Constants
// ============================================================================

/**
 * Valid UK company number prefixes
 * https://anna.money/blog/guides/company-registration-number-crn-in-the-uk-what-is-it/
 */
const UK_VALID_PREFIXES = [
  'SC', // Scotland Ltd
  'NI', // Northern Ireland Ltd
  'OC', // England/Wales LLP
  'SO', // Scotland LLP
  'NC', // Northern Ireland LLP
  'RC', // Royal Charter
  'IP', // Industrial Provident
  'AC', // Assurance Company
  'FS', // Friendly Society
  'FC', // Foreign Company
  'NF', // Northern Ireland Foreign
  'GE', // European Economic Interest Grouping
  'LP', // Limited Partnership
  'SL', // Scottish Limited Partnership
  'NL', // Northern Ireland Limited Partnership
  'SF', // Scottish Partnership
  'NP', // Northern Ireland Partnership
  'RS', // Registered Society
  'GN', // General Partnership
  'CE', // Community Interest Company
  'PC', // Protected Cell Company
  'SR', // Scottish Partnership
] as const

/**
 * Pre-compiled regex pattern for UK prefix validation
 */
const UK_PREFIX_PATTERN = new RegExp(`^(${UK_VALID_PREFIXES.join('|')})\\d{6}$`)

// ============================================================================
// Country-Specific Validators
// ============================================================================

/**
 * France - SIREN (9 digits) or SIRET (14 digits)
 *
 * Format:
 * - SIREN: 9 digits with Luhn check digit
 * - SIRET: 14 digits (SIREN + 5-digit NIC), entire number passes Luhn
 *
 * Examples: 732829320 (SIREN), 73282932000074 (SIRET)
 */
export const validateFrenchCompanyNumber = (companyNumber: string): boolean => {
  const cleaned = companyNumber.replace(/[\s.-]/g, '')

  // Must be 9 (SIREN) or 14 (SIRET) digits
  if (!/^\d{9}$/.test(cleaned) && !/^\d{14}$/.test(cleaned)) {
    return false
  }

  // Validate Luhn checksum
  return isValidLuhn(cleaned)
}

/**
 * United Kingdom - Company Registration Number (CRN)
 *
 * Format (always 8 characters total):
 * - England/Wales Ltd: 8 digits (often starting with 0 or 1)
 * - Scotland Ltd: SC + 6 digits
 * - Northern Ireland Ltd: NI + 6 digits
 * - England/Wales LLP: OC + 6 digits
 * - Scotland LLP: SO + 6 digits
 * - Northern Ireland LLP: NC + 6 digits
 * - Community Interest Company: Numeric or with prefix
 * - Royal Charter: RC + 6 digits
 * - Industrial Provident: IP + 6 digits
 * - Assurance Company: AC + 6 digits
 * - Friendly Society: FS + 6 digits
 * - Foreign Company: FC + 6 digits
 *
 * Examples: 01234567, SC123456, OC123456
 */
export const validateUKCompanyNumber = (companyNumber: string): boolean => {
  const cleaned = companyNumber.replace(/[\s.-]/g, '').toUpperCase()

  // 8 digits (standard England/Wales)
  if (/^\d{8}$/.test(cleaned)) {
    return true
  }

  // 2-letter prefix + 6 digits (uses pre-compiled module-level pattern)
  return UK_PREFIX_PATTERN.test(cleaned)
}

/**
 * Germany - Handelsregisternummer
 *
 * Format:
 * - HRA + digits (partnerships, sole traders)
 * - HRB + digits (incorporated companies: GmbH, UG, AG)
 * - GnR + digits (cooperatives)
 * - PR + digits (partnerships register)
 * - VR + digits (associations register)
 * - Pure numeric (4-8 digits)
 *
 * Note: Numbers are NOT unique across Germany (court context required)
 *
 * Examples: HRB 12345, HRA 54321, 123456
 */
export const validateGermanCompanyNumber = (companyNumber: string): boolean => {
  const cleaned = companyNumber.replace(/[\s.-]/g, '').toUpperCase()

  // HRB/HRA/GnR/PR/VR format (case insensitive)
  // Pattern matches prefix + optional space + 1-7 digits
  if (/^(HRB|HRA|GNR|PR|VR)\d{1,7}$/i.test(cleaned)) {
    return true
  }

  // Pure numeric format (4-8 digits)
  return /^\d{4,8}$/.test(cleaned)
}

/**
 * Belgium - Enterprise Number (BCE/KBO)
 *
 * Format: 10 digits starting with 0 or 1
 * - First digit: 0 or 1
 * - Digits 2-8: Sequential number
 * - Digits 9-10: Check digits (97 - first 8 mod 97)
 *
 * Display format: 0XXX.XXX.XXX or BE 0XXX.XXX.XXX
 *
 * Example: 0123456749 (where 49 = 97 - (01234567 mod 97))
 */
export const validateBelgianCompanyNumber = (
  companyNumber: string,
): boolean => {
  const cleaned = companyNumber.replace(/[\s.-]/g, '').replace(/^BE/i, '')

  // Must be 10 digits starting with 0 or 1
  if (!/^[01]\d{9}$/.test(cleaned)) {
    return false
  }

  // Validate modulo 97 check digit
  return isValidBelgianCheckDigit(cleaned)
}

/**
 * Switzerland - CHE/UID (Unternehmens-Identifikationsnummer)
 *
 * Format: CHE-XXX.XXX.XXX or 9 digits
 * - Prefix: CHE (ISO 3166-1 alpha-3)
 * - Number: 9 digits with modulo 11 check digit
 *
 * VAT suffix (optional): MWST, TVA, or IVA
 *
 * Example: CHE-123.456.789
 */
export const validateSwissCompanyNumber = (companyNumber: string): boolean => {
  // Remove VAT suffix if present
  const withoutVat = companyNumber.replace(/\s*(MWST|TVA|IVA)\s*$/i, '').trim()

  // CHE format with separators
  const cheMatch = withoutVat.match(
    /^CHE[- ]?(\d{3})[. ]?(\d{3})[. ]?(\d{3})$/i,
  )
  if (cheMatch) {
    const digits = cheMatch[1] + cheMatch[2] + cheMatch[3]
    return isValidSwissCheckDigit(digits)
  }

  // Pure 9-digit format
  const cleaned = withoutVat.replace(/[\s.-]/g, '')
  if (/^\d{9}$/.test(cleaned)) {
    return isValidSwissCheckDigit(cleaned)
  }

  return false
}

/**
 * Netherlands - KVK Number (Kamer van Koophandel)
 *
 * Format: 8 digits
 * No check digit algorithm is publicly documented
 *
 * Example: 12345678
 */
export const validateDutchCompanyNumber = (companyNumber: string): boolean => {
  const cleaned = companyNumber.replace(/[\s.-]/g, '')
  return /^\d{8}$/.test(cleaned)
}

/**
 * Luxembourg - RCS Number (Registre de Commerce et des Societes)
 *
 * Format: Letter prefix + 5-7 digits
 * - B: Commercial companies (SARL, SA)
 * - A: Civil companies
 * - C: Branch offices
 * - D: Groupements d'interet economique
 * - F: Fiducies
 * - G: GEIE
 * - J: Sole traders (auto-entrepreneurs)
 *
 * Example: B123456
 */
export const validateLuxembourgCompanyNumber = (
  companyNumber: string,
): boolean => {
  const cleaned = companyNumber.replace(/[\s.-]/g, '').toUpperCase()

  // Letter prefix + 5-7 digits (most common format)
  if (/^[ABCDFGJ]\d{5,7}$/.test(cleaned)) {
    return true
  }

  // Pure numeric (6-8 digits) for legacy numbers
  if (/^\d{6,8}$/.test(cleaned)) {
    return true
  }

  return false
}

/**
 * Spain - CIF/NIF (Codigo de Identificacion Fiscal / Numero de Identificacion Fiscal)
 *
 * Accepts two formats:
 *
 * 1. SPANISH CIF FORMAT (9 chars): Letter + 7 digits + Control character
 *
 * First character (entity type):
 * - A: Stock corporations (SA)
 * - B: Limited liability (SL)
 * - C: General partnerships
 * - D: Limited partnerships
 * - E: Community property
 * - F: Cooperatives
 * - G: Associations
 * - H: Housing communities
 * - J: Civil corporations
 * - K: Spanish format for non-residents under 14
 * - L: Non-residents without NIE (old format)
 * - M: Non-residents with NIE
 * - N: Foreign entities
 * - P: Local authorities
 * - Q: Public institutions
 * - R: Religious congregations
 * - S: Government organs
 * - U: Joint ventures (UTE)
 * - V: Other entity types
 * - W: Permanent establishments of non-residents
 * - X, Y, Z: NIE format for foreigners
 * - 0-9: Old NIF format for individuals (legacy)
 *
 * Control character (last):
 * - For A, B, E, H: Must be a digit (0-9)
 * - For K, P, Q, S: Must be a letter (A-J)
 * - For others: Can be digit or letter
 *
 * Example: B12345678, A28123456, Q2812345J
 *
 * 2. PAPPERS INTERNAL ID FORMAT (10-15 digits): Numeric identifier used by Pappers.es
 *
 * Example: 1000338625056 (https://pappers.es/en/company/elaboraciones-gastronomicas-sl-1000338625056)
 */
export const validateSpanishCompanyNumber = (
  companyNumber: string,
): boolean => {
  const cleaned = companyNumber.replace(/[\s.-]/g, '').toUpperCase()

  // Format 1: Pappers internal ID (10-15 digits, purely numeric)
  // These are used by pappers.es as internal company identifiers
  if (/^\d{10,15}$/.test(cleaned)) {
    return true
  }

  // Format 2: Standard Spanish CIF (9 characters)
  if (cleaned.length !== 9) {
    return false
  }

  // Standard CIF format: Valid entity letter + 7 digits + control char
  // Entity letters for companies
  const companyEntityLetters = 'ABCDEFGHJNPQRSUVW'
  // NIE letters for individuals/foreigners
  const nieLetters = 'XYZKLM'
  // Combined with digits for old NIF format (lenient mode)
  const validFirstChars = `${companyEntityLetters}${nieLetters}0-9`

  // Pattern: Valid first char + 7 digits + alphanumeric control
  const cifPattern = new RegExp(`^[${validFirstChars}]\\d{7}[A-Z0-9]$`)

  if (!cifPattern.test(cleaned)) {
    return false
  }

  // Additional validation: Check control character type based on entity letter
  const entityLetter = cleaned[0]
  const controlChar = cleaned[8]

  // For A, B, E, H: control must be digit
  if ('ABEH'.includes(entityLetter)) {
    if (!/^\d$/.test(controlChar)) {
      return false
    }
  }

  // For K, P, Q, S: control must be letter
  if ('KPQS'.includes(entityLetter)) {
    if (!/^[A-J]$/.test(controlChar)) {
      return false
    }
  }

  return true
}

/**
 * Norway - Organisasjonsnummer
 *
 * Format: 9 digits with modulo 11 check digit
 * - First digit: Usually 8 or 9
 * - Last digit: Check digit
 *
 * Example: 123456789
 */
export const validateNorwegianCompanyNumber = (
  companyNumber: string,
): boolean => {
  const cleaned = companyNumber.replace(/[\s.-]/g, '')

  if (!/^\d{9}$/.test(cleaned)) {
    return false
  }

  return isValidNorwegianCheckDigit(cleaned)
}

// ============================================================================
// Main Validator Orchestrator
// ============================================================================

/**
 * Map of country codes to their respective validator functions
 */
const validators: Record<
  SupportedCountryCode,
  (companyNumber: string) => boolean
> = {
  FR: validateFrenchCompanyNumber,
  UK: validateUKCompanyNumber,
  DE: validateGermanCompanyNumber,
  BE: validateBelgianCompanyNumber,
  CH: validateSwissCompanyNumber,
  NL: validateDutchCompanyNumber,
  LU: validateLuxembourgCompanyNumber,
  ES: validateSpanishCompanyNumber,
  NO: validateNorwegianCompanyNumber,
}

/**
 * Check if a country code is supported for validation
 */
const isSupportedCountryCode = (
  countryCode: string,
): countryCode is SupportedCountryCode => {
  return countryCode in validators
}

/**
 * Validates a company number format based on country code
 *
 * @param companyNumber - The company registration number to validate
 * @param countryCode - ISO country code (FR, UK, DE, BE, CH, NL, LU, ES, NO)
 * @returns true if the format is valid, false otherwise
 */
export const isValidCompanyNumber = (
  companyNumber: string,
  countryCode: string,
): boolean => {
  if (!companyNumber || typeof companyNumber !== 'string') {
    return false
  }

  // Use type guard to safely access the validator
  if (!isSupportedCountryCode(countryCode)) {
    // For unknown countries, basic validation: at least 3 alphanumeric characters
    const cleaned = companyNumber.replace(/[\s.-]/g, '')
    const isValid = cleaned.length >= 3 && /^[A-Z0-9]+$/i.test(cleaned)

    if (!isValid) {
      logger.warn({
        msg: '[company_number_validators] Company number rejected by basic validation',
        event: 'company_number_validation_rejected',
        metadata: {
          companyNumber,
          countryCode,
          reason: 'unsupported_country_basic_format_mismatch',
        },
      })
    }

    return isValid
  }

  const validator = validators[countryCode]
  const isValid = validator(companyNumber)

  if (!isValid) {
    logger.warn({
      msg: '[company_number_validators] Company number rejected by format validation',
      event: 'company_number_validation_rejected',
      metadata: {
        companyNumber,
        countryCode,
        reason: 'format_mismatch',
      },
    })
  }

  return isValid
}

// ============================================================================
// Strict Country Format Validators (for website-extracted numbers)
// ============================================================================

/**
 * Strict Spanish CIF validator - only accepts official CIF format, NOT Pappers IDs
 * Use this for validating company numbers extracted from websites
 */
const validateStrictSpanishCIF = (companyNumber: string): boolean => {
  const cleaned = companyNumber.replace(/[\s.-]/g, '').toUpperCase()

  // Must be exactly 9 characters (no Pappers IDs)
  if (cleaned.length !== 9) {
    return false
  }

  // Standard CIF format: Valid entity letter + 7 digits + control char
  const companyEntityLetters = 'ABCDEFGHJNPQRSUVW'
  const nieLetters = 'XYZKLM'
  const validFirstChars = `${companyEntityLetters}${nieLetters}0-9`

  const cifPattern = new RegExp(`^[${validFirstChars}]\\d{7}[A-Z0-9]$`)

  if (!cifPattern.test(cleaned)) {
    return false
  }

  const entityLetter = cleaned[0]
  const controlChar = cleaned[8]

  if ('ABEH'.includes(entityLetter)) {
    if (!/^\d$/.test(controlChar)) {
      return false
    }
  }

  if ('KPQS'.includes(entityLetter)) {
    if (!/^[A-J]$/.test(controlChar)) {
      return false
    }
  }

  return true
}

/**
 * Strict country format validators - only accept official national formats
 * Does NOT accept Pappers internal IDs
 */
const strictValidators: Record<
  SupportedCountryCode,
  (companyNumber: string) => boolean
> = {
  FR: validateFrenchCompanyNumber,
  UK: validateUKCompanyNumber,
  DE: validateGermanCompanyNumber,
  BE: validateBelgianCompanyNumber,
  CH: validateSwissCompanyNumber,
  NL: validateDutchCompanyNumber,
  LU: validateLuxembourgCompanyNumber,
  ES: validateStrictSpanishCIF, // Strict CIF only, no Pappers IDs
  NO: validateNorwegianCompanyNumber,
}

/**
 * Validates a company number against STRICT country format
 * Use this for validating numbers extracted from websites (Qdrant extraction)
 * Does NOT accept Pappers internal IDs
 *
 * @param companyNumber - The company registration number to validate
 * @param countryCode - ISO country code (FR, UK, DE, BE, CH, NL, LU, ES, NO)
 * @returns true if the format matches official country format, false otherwise
 */
export const isValidStrictCountryFormat = (
  companyNumber: string,
  countryCode: string,
): boolean => {
  if (!companyNumber || typeof companyNumber !== 'string') {
    return false
  }

  if (!isSupportedCountryCode(countryCode)) {
    // For unknown countries, basic validation
    const cleaned = companyNumber.replace(/[\s.-]/g, '')
    return cleaned.length >= 3 && /^[A-Z0-9]+$/i.test(cleaned)
  }

  const validator = strictValidators[countryCode]
  return validator(companyNumber)
}
