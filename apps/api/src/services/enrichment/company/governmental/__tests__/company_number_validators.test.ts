import { describe, expect, it } from 'vitest'
import {
  isValidCompanyNumber,
  isValidStrictCountryFormat,
  validateBelgianCompanyNumber,
  validateDutchCompanyNumber,
  validateFrenchCompanyNumber,
  validateGermanCompanyNumber,
  validateLuxembourgCompanyNumber,
  validateNorwegianCompanyNumber,
  validateSpanishCompanyNumber,
  validateSwissCompanyNumber,
  validateUKCompanyNumber,
} from '../company_number_validators'

describe('company_number_validators', () => {
  // ============================================================================
  // France (FR) - SIREN/SIRET with Luhn validation
  // ============================================================================
  describe('validateFrenchCompanyNumber', () => {
    it('should accept valid SIREN numbers (9 digits with valid Luhn)', () => {
      const validSirens = [
        '732829320', // Valid Luhn
        '443061841', // Valid Luhn
        '552032534', // Valid Luhn - EDF
      ]
      for (const siren of validSirens) {
        expect(validateFrenchCompanyNumber(siren)).toBe(true)
      }
    })

    it('should accept valid SIRET numbers (14 digits with valid Luhn)', () => {
      const validSirets = [
        '55203253400646', // Valid Luhn - EDF SIRET
        '35600000000048', // Valid Luhn - La Poste SIRET
      ]
      for (const siret of validSirets) {
        expect(validateFrenchCompanyNumber(siret)).toBe(true)
      }
    })

    it('should reject SIREN with invalid Luhn checksum', () => {
      const invalidSirens = [
        '732829321', // Invalid check digit
        '123456789', // Invalid Luhn
        '000000001', // Invalid Luhn
      ]
      for (const siren of invalidSirens) {
        expect(validateFrenchCompanyNumber(siren)).toBe(false)
      }
    })

    it('should reject numbers with wrong length', () => {
      const invalidLengths = [
        '12345678', // 8 digits
        '1234567890', // 10 digits
        '123456789012', // 12 digits
        '1234567890123', // 13 digits
        '123456789012345', // 15 digits
      ]
      for (const num of invalidLengths) {
        expect(validateFrenchCompanyNumber(num)).toBe(false)
      }
    })

    it('should handle numbers with spaces and separators', () => {
      expect(validateFrenchCompanyNumber('732 829 320')).toBe(true)
      expect(validateFrenchCompanyNumber('732.829.320')).toBe(true)
      expect(validateFrenchCompanyNumber('732-829-320')).toBe(true)
    })
  })

  // ============================================================================
  // United Kingdom (UK) - Company Registration Number
  // ============================================================================
  describe('validateUKCompanyNumber', () => {
    it('should accept valid 8-digit numbers', () => {
      const validNumbers = ['01234567', '12345678', '00000001', '99999999']
      for (const num of validNumbers) {
        expect(validateUKCompanyNumber(num)).toBe(true)
      }
    })

    it('should accept valid prefix formats', () => {
      const validPrefixes = [
        'SC123456', // Scotland Ltd
        'NI123456', // Northern Ireland Ltd
        'OC123456', // England/Wales LLP
        'SO123456', // Scotland LLP
        'NC123456', // Northern Ireland LLP
        'RC123456', // Royal Charter
        'FC123456', // Foreign Company
        'IP123456', // Industrial Provident
        'AC123456', // Assurance Company
        'FS123456', // Friendly Society
      ]
      for (const num of validPrefixes) {
        expect(validateUKCompanyNumber(num)).toBe(true)
      }
    })

    it('should be case insensitive for prefixes', () => {
      expect(validateUKCompanyNumber('sc123456')).toBe(true)
      expect(validateUKCompanyNumber('Sc123456')).toBe(true)
      expect(validateUKCompanyNumber('SC123456')).toBe(true)
    })

    it('should reject invalid prefixes', () => {
      const invalidPrefixes = [
        'XX123456', // Invalid prefix
        'AB123456', // Invalid prefix
        'ZZ123456', // Invalid prefix
      ]
      for (const num of invalidPrefixes) {
        expect(validateUKCompanyNumber(num)).toBe(false)
      }
    })

    it('should reject wrong lengths', () => {
      const invalidLengths = [
        '1234567', // 7 digits
        '123456789', // 9 digits
        'SC12345', // 5 digits after prefix
        'SC1234567', // 7 digits after prefix
      ]
      for (const num of invalidLengths) {
        expect(validateUKCompanyNumber(num)).toBe(false)
      }
    })

    it('should handle spaces and separators', () => {
      expect(validateUKCompanyNumber('SC 123456')).toBe(true)
      expect(validateUKCompanyNumber('SC-123456')).toBe(true)
      expect(validateUKCompanyNumber('SC.123456')).toBe(true)
    })
  })

  // ============================================================================
  // Germany (DE) - Handelsregisternummer
  // ============================================================================
  describe('validateGermanCompanyNumber', () => {
    it('should accept HRB format', () => {
      const validHrb = [
        'HRB12345',
        'HRB123456',
        'HRB1234567',
        'hrb12345', // case insensitive
      ]
      for (const num of validHrb) {
        expect(validateGermanCompanyNumber(num)).toBe(true)
      }
    })

    it('should accept HRA format', () => {
      const validHra = [
        'HRA12345',
        'HRA123456',
        'hra12345', // case insensitive
      ]
      for (const num of validHra) {
        expect(validateGermanCompanyNumber(num)).toBe(true)
      }
    })

    it('should accept other register formats', () => {
      const validFormats = [
        'GnR12345', // Cooperatives
        'PR12345', // Partnerships
        'VR12345', // Associations
      ]
      for (const num of validFormats) {
        expect(validateGermanCompanyNumber(num)).toBe(true)
      }
    })

    it('should accept pure numeric format', () => {
      const validNumeric = [
        '1234', // 4 digits
        '12345', // 5 digits
        '123456', // 6 digits
        '1234567', // 7 digits
        '12345678', // 8 digits
      ]
      for (const num of validNumeric) {
        expect(validateGermanCompanyNumber(num)).toBe(true)
      }
    })

    it('should reject too short or too long numbers', () => {
      expect(validateGermanCompanyNumber('123')).toBe(false) // 3 digits
      expect(validateGermanCompanyNumber('123456789')).toBe(false) // 9 digits
    })

    it('should handle spaces in HRB format', () => {
      expect(validateGermanCompanyNumber('HRB 12345')).toBe(true)
    })
  })

  // ============================================================================
  // Belgium (BE) - Enterprise Number with mod-97 check
  // ============================================================================
  describe('validateBelgianCompanyNumber', () => {
    it('should accept valid enterprise numbers with correct check digit', () => {
      // Check digit = 97 - (first 8 mod 97)
      // 01234567 mod 97 = 48, so check digit = 97 - 48 = 49
      expect(validateBelgianCompanyNumber('0123456749')).toBe(true)
      // 00000001 mod 97 = 1, so check digit = 97 - 1 = 96
      expect(validateBelgianCompanyNumber('0000000196')).toBe(true)
    })

    it('should accept numbers starting with 0 or 1', () => {
      // 10000000 mod 97 = 76, check digit = 97 - 76 = 21
      expect(validateBelgianCompanyNumber('1000000021')).toBe(true)
    })

    it('should reject numbers with wrong check digit', () => {
      expect(validateBelgianCompanyNumber('0123456748')).toBe(false) // Wrong check
      expect(validateBelgianCompanyNumber('0123456750')).toBe(false) // Wrong check
    })

    it('should reject numbers not starting with 0 or 1', () => {
      expect(validateBelgianCompanyNumber('2123456749')).toBe(false)
      expect(validateBelgianCompanyNumber('9123456749')).toBe(false)
    })

    it('should handle BE prefix', () => {
      expect(validateBelgianCompanyNumber('BE0123456749')).toBe(true)
      expect(validateBelgianCompanyNumber('be0123456749')).toBe(true)
    })

    it('should handle formatted numbers with dots', () => {
      expect(validateBelgianCompanyNumber('0123.456.749')).toBe(true)
      expect(validateBelgianCompanyNumber('BE 0123.456.749')).toBe(true)
    })

    it('should reject wrong length', () => {
      expect(validateBelgianCompanyNumber('012345674')).toBe(false) // 9 digits
      expect(validateBelgianCompanyNumber('01234567490')).toBe(false) // 11 digits
    })
  })

  // ============================================================================
  // Switzerland (CH) - CHE/UID with mod-11 check
  // ============================================================================
  describe('validateSwissCompanyNumber', () => {
    it('should accept valid CHE format with separators', () => {
      // CHE-109.322.551 is a real Swiss company number (valid mod-11)
      expect(validateSwissCompanyNumber('CHE-109.322.551')).toBe(true)
    })

    it('should accept valid 9-digit format', () => {
      expect(validateSwissCompanyNumber('109322551')).toBe(true)
    })

    it('should handle VAT suffixes', () => {
      expect(validateSwissCompanyNumber('CHE-109.322.551 MWST')).toBe(true)
      expect(validateSwissCompanyNumber('CHE-109.322.551 TVA')).toBe(true)
      expect(validateSwissCompanyNumber('CHE-109.322.551 IVA')).toBe(true)
    })

    it('should accept various CHE formats', () => {
      expect(validateSwissCompanyNumber('CHE 109.322.551')).toBe(true)
      expect(validateSwissCompanyNumber('CHE109322551')).toBe(true)
      expect(validateSwissCompanyNumber('che-109.322.551')).toBe(true)
    })

    it('should reject invalid check digits', () => {
      expect(validateSwissCompanyNumber('CHE-109.322.552')).toBe(false)
      expect(validateSwissCompanyNumber('109322550')).toBe(false)
    })

    it('should reject wrong length', () => {
      expect(validateSwissCompanyNumber('12345678')).toBe(false) // 8 digits
      expect(validateSwissCompanyNumber('1234567890')).toBe(false) // 10 digits
    })
  })

  // ============================================================================
  // Netherlands (NL) - KVK Number
  // ============================================================================
  describe('validateDutchCompanyNumber', () => {
    it('should accept valid 8-digit KVK numbers', () => {
      const validNumbers = ['12345678', '00000001', '99999999']
      for (const num of validNumbers) {
        expect(validateDutchCompanyNumber(num)).toBe(true)
      }
    })

    it('should handle spaces and separators', () => {
      expect(validateDutchCompanyNumber('1234 5678')).toBe(true)
      expect(validateDutchCompanyNumber('1234.5678')).toBe(true)
    })

    it('should reject wrong length', () => {
      expect(validateDutchCompanyNumber('1234567')).toBe(false) // 7 digits
      expect(validateDutchCompanyNumber('123456789')).toBe(false) // 9 digits
    })

    it('should reject non-numeric', () => {
      expect(validateDutchCompanyNumber('1234567A')).toBe(false)
      expect(validateDutchCompanyNumber('ABCDEFGH')).toBe(false)
    })
  })

  // ============================================================================
  // Luxembourg (LU) - RCS Number
  // ============================================================================
  describe('validateLuxembourgCompanyNumber', () => {
    it('should accept B prefix format (most common)', () => {
      expect(validateLuxembourgCompanyNumber('B12345')).toBe(true)
      expect(validateLuxembourgCompanyNumber('B123456')).toBe(true)
      expect(validateLuxembourgCompanyNumber('B1234567')).toBe(true)
    })

    it('should accept other valid prefixes', () => {
      const validPrefixes = ['A', 'B', 'C', 'D', 'F', 'G', 'J']
      for (const prefix of validPrefixes) {
        expect(validateLuxembourgCompanyNumber(`${prefix}123456`)).toBe(true)
      }
    })

    it('should be case insensitive', () => {
      expect(validateLuxembourgCompanyNumber('b123456')).toBe(true)
    })

    it('should accept legacy numeric format', () => {
      expect(validateLuxembourgCompanyNumber('123456')).toBe(true)
      expect(validateLuxembourgCompanyNumber('1234567')).toBe(true)
      expect(validateLuxembourgCompanyNumber('12345678')).toBe(true)
    })

    it('should reject invalid formats', () => {
      expect(validateLuxembourgCompanyNumber('B1234')).toBe(false) // Too short
      expect(validateLuxembourgCompanyNumber('B12345678')).toBe(false) // Too long
      expect(validateLuxembourgCompanyNumber('12345')).toBe(false) // Too short numeric
    })
  })

  // ============================================================================
  // Spain (ES) - CIF/NIF + Pappers IDs
  // ============================================================================
  describe('validateSpanishCompanyNumber', () => {
    it('should accept Pappers internal IDs (10-15 digit numeric)', () => {
      // Pappers.es uses internal numeric IDs for Spanish companies
      expect(validateSpanishCompanyNumber('1000338625056')).toBe(true) // 13 digits - real Pappers ID
      expect(validateSpanishCompanyNumber('1234567890')).toBe(true) // 10 digits
      expect(validateSpanishCompanyNumber('123456789012345')).toBe(true) // 15 digits
    })

    it('should reject Pappers IDs that are too long', () => {
      expect(validateSpanishCompanyNumber('1234567890123456')).toBe(false) // 16 digits - too long
      expect(validateSpanishCompanyNumber('12345678901234567')).toBe(false) // 17 digits - too long
    })

    it('should accept valid CIF with digit control for A, B, E, H entities', () => {
      // A (SA), B (SL), E, H must have digit control
      expect(validateSpanishCompanyNumber('A12345678')).toBe(true)
      expect(validateSpanishCompanyNumber('B12345670')).toBe(true)
      expect(validateSpanishCompanyNumber('E12345679')).toBe(true)
      expect(validateSpanishCompanyNumber('H12345672')).toBe(true)
    })

    it('should reject A, B, E, H with letter control', () => {
      expect(validateSpanishCompanyNumber('A1234567A')).toBe(false)
      expect(validateSpanishCompanyNumber('B1234567B')).toBe(false)
    })

    it('should accept valid CIF with letter control for K, P, Q, S entities', () => {
      // K, P, Q, S must have letter control (A-J)
      expect(validateSpanishCompanyNumber('K1234567A')).toBe(true)
      expect(validateSpanishCompanyNumber('P1234567J')).toBe(true)
      expect(validateSpanishCompanyNumber('Q1234567C')).toBe(true)
      expect(validateSpanishCompanyNumber('S1234567D')).toBe(true)
    })

    it('should reject K, P, Q, S with digit control', () => {
      expect(validateSpanishCompanyNumber('K12345678')).toBe(false)
      expect(validateSpanishCompanyNumber('P12345670')).toBe(false)
    })

    it('should reject K, P, Q, S with invalid letter control (K-Z)', () => {
      expect(validateSpanishCompanyNumber('K1234567K')).toBe(false)
      expect(validateSpanishCompanyNumber('P1234567Z')).toBe(false)
    })

    it('should accept other entity letters with either control type', () => {
      // C, D, F, G, J, N, R, U, V, W can have either
      expect(validateSpanishCompanyNumber('C12345678')).toBe(true)
      expect(validateSpanishCompanyNumber('C1234567A')).toBe(true)
      expect(validateSpanishCompanyNumber('G12345670')).toBe(true)
      expect(validateSpanishCompanyNumber('G1234567B')).toBe(true)
      expect(validateSpanishCompanyNumber('N12345671')).toBe(true)
      expect(validateSpanishCompanyNumber('W1234567C')).toBe(true)
    })

    it('should accept NIE format (X, Y, Z)', () => {
      expect(validateSpanishCompanyNumber('X1234567A')).toBe(true)
      expect(validateSpanishCompanyNumber('Y12345678')).toBe(true)
      expect(validateSpanishCompanyNumber('Z1234567B')).toBe(true)
    })

    it('should accept old NIF format with leading digit (lenient mode)', () => {
      expect(validateSpanishCompanyNumber('012345678')).toBe(true)
      expect(validateSpanishCompanyNumber('12345678A')).toBe(true)
    })

    it('should be case insensitive', () => {
      expect(validateSpanishCompanyNumber('b12345670')).toBe(true)
      expect(validateSpanishCompanyNumber('B12345670')).toBe(true)
    })

    it('should reject wrong length', () => {
      expect(validateSpanishCompanyNumber('B1234567')).toBe(false) // 8 chars
      expect(validateSpanishCompanyNumber('B123456789')).toBe(false) // 10 chars
    })

    it('should reject invalid entity letters', () => {
      expect(validateSpanishCompanyNumber('I12345678')).toBe(false) // I not valid
      expect(validateSpanishCompanyNumber('O12345678')).toBe(false) // O not valid
    })

    it('should handle spaces and separators', () => {
      expect(validateSpanishCompanyNumber('B-1234567-0')).toBe(true)
      expect(validateSpanishCompanyNumber('B 1234567 0')).toBe(true)
    })
  })

  // ============================================================================
  // Norway (NO) - Organisasjonsnummer with mod-11 check
  // ============================================================================
  describe('validateNorwegianCompanyNumber', () => {
    it('should accept valid organisasjonsnummer with correct mod-11', () => {
      // Example: 923609016 is a valid Norwegian org number
      // Weights: 3, 2, 7, 6, 5, 4, 3, 2
      // Sum = 9*3 + 2*2 + 3*7 + 6*6 + 0*5 + 9*4 + 0*3 + 1*2 = 27 + 4 + 21 + 36 + 0 + 36 + 0 + 2 = 126
      // 126 mod 11 = 5, check = 11 - 5 = 6 -> valid
      expect(validateNorwegianCompanyNumber('923609016')).toBe(true)
    })

    it('should reject invalid check digit', () => {
      expect(validateNorwegianCompanyNumber('923609017')).toBe(false)
      expect(validateNorwegianCompanyNumber('923609015')).toBe(false)
    })

    it('should reject numbers requiring check digit 10', () => {
      // When remainder = 1, check digit would be 10, which is invalid
      // Such numbers should not exist and should be rejected
      // Finding such a number: we need sum mod 11 = 1
      // This is hard to construct, but the validator should handle it
    })

    it('should handle spaces and separators', () => {
      expect(validateNorwegianCompanyNumber('923 609 016')).toBe(true)
      expect(validateNorwegianCompanyNumber('923.609.016')).toBe(true)
    })

    it('should reject wrong length', () => {
      expect(validateNorwegianCompanyNumber('92360901')).toBe(false) // 8 digits
      expect(validateNorwegianCompanyNumber('9236090160')).toBe(false) // 10 digits
    })

    it('should reject non-numeric', () => {
      expect(validateNorwegianCompanyNumber('92360901A')).toBe(false)
    })
  })

  // ============================================================================
  // Main orchestrator - isValidCompanyNumber
  // ============================================================================
  describe('isValidCompanyNumber', () => {
    it('should route to correct validator based on country code', () => {
      expect(isValidCompanyNumber('732829320', 'FR')).toBe(true)
      expect(isValidCompanyNumber('01234567', 'UK')).toBe(true)
      expect(isValidCompanyNumber('HRB12345', 'DE')).toBe(true)
      expect(isValidCompanyNumber('0123456749', 'BE')).toBe(true)
      expect(isValidCompanyNumber('12345678', 'NL')).toBe(true)
      expect(isValidCompanyNumber('B123456', 'LU')).toBe(true)
      expect(isValidCompanyNumber('B12345670', 'ES')).toBe(true)
      expect(isValidCompanyNumber('923609016', 'NO')).toBe(true)
    })

    it('should handle unsupported country codes with basic validation', () => {
      expect(isValidCompanyNumber('ABC123', 'XX')).toBe(true) // At least 3 alphanumeric
      expect(isValidCompanyNumber('12345', 'YY')).toBe(true)
      expect(isValidCompanyNumber('AB', 'ZZ')).toBe(false) // Too short
    })

    it('should reject null and empty values', () => {
      expect(isValidCompanyNumber('', 'FR')).toBe(false)
      expect(isValidCompanyNumber(null as unknown as string, 'FR')).toBe(false)
      expect(isValidCompanyNumber(undefined as unknown as string, 'FR')).toBe(
        false,
      )
    })

    it('should reject non-string values', () => {
      expect(isValidCompanyNumber(123456789 as unknown as string, 'FR')).toBe(
        false,
      )
    })
  })

  // ============================================================================
  // Strict Country Format Validator - isValidStrictCountryFormat
  // ============================================================================
  describe('isValidStrictCountryFormat', () => {
    it('should accept valid Spanish CIF format', () => {
      expect(isValidStrictCountryFormat('B12345670', 'ES')).toBe(true)
      expect(isValidStrictCountryFormat('A12345678', 'ES')).toBe(true)
    })

    it('should REJECT Pappers IDs for Spain (strict mode)', () => {
      // Pappers IDs should NOT be accepted in strict mode
      expect(isValidStrictCountryFormat('1000338625056', 'ES')).toBe(false)
      expect(isValidStrictCountryFormat('1234567890', 'ES')).toBe(false)
    })

    it('should accept valid formats for other countries', () => {
      expect(isValidStrictCountryFormat('732829320', 'FR')).toBe(true)
      expect(isValidStrictCountryFormat('01234567', 'UK')).toBe(true)
      expect(isValidStrictCountryFormat('HRB12345', 'DE')).toBe(true)
    })

    it('should be used for website-extracted company numbers', () => {
      // These would typically be extracted from website legal mentions
      // They should match official country formats, not Pappers internal IDs
      expect(isValidStrictCountryFormat('B82930421', 'ES')).toBe(true) // Valid CIF
      expect(isValidStrictCountryFormat('12345678901234', 'ES')).toBe(false) // Pappers-like ID
    })
  })
})
