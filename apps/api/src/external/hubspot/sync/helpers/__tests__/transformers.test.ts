import { LEAD_STATUS_MAPPING } from '@ritchy/types'
import type {
  CompanyMapping,
  ContactMapping,
  InternalLeadStatus,
  PlaceBase,
} from '@ritchy/types'
import { describe, expect, it } from 'vitest'
import { transformCompanyData, transformContactData } from '../transformers'

/**
 * Test suite for HubSpot data transformers
 *
 * These tests verify the transformation of internal data structures to HubSpot's format.
 * When adding new transformations:
 * 1. Add test cases for both valid and invalid inputs
 * 2. Test edge cases (empty strings, special characters, etc.)
 * 3. Document any HubSpot-specific format requirements
 * 4. Update these tests when adding new fields or changing transformation logic
 *
 * HubSpot Field Requirements:
 * - Contact fields: firstname, lastname, email, phone, hs_lead_status
 * - Company fields: name, website (hostname only), phone, address fields
 * - All fields are optional but should be properly formatted when present
 */

// Helper functions to reduce test code duplication
const createMockContactData = (overrides = {}) => ({
  firstname: 'John',
  lastname: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  ...overrides,
})

const createMockContactMappings = (overrides: ContactMapping[] = []) => [
  {
    id: 'test-id-1',
    tokenId: 'test-token',
    internalField: 'contact.firstname' as const,
    hubspotField: 'firstname',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'test-id-2',
    tokenId: 'test-token',
    internalField: 'contact.lastname' as const,
    hubspotField: 'lastname',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'test-id-3',
    tokenId: 'test-token',
    internalField: 'contact.email' as const,
    hubspotField: 'email',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'test-id-4',
    tokenId: 'test-token',
    internalField: 'contact.phone' as const,
    hubspotField: 'phone',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  ...overrides,
]

const createMockPlace = (overrides = {}) => ({
  id: 'place-123',
  name: 'Test Company',
  website: 'https://testcompany.com',
  phone: '+1234567890',
  location: { latitude: 0, longitude: 0 },
  types: ['restaurant'],
  utcOffsetMinutes: 0,
  googleMapsUri: 'https://maps.google.com',
  address: {
    street: '123 Main St',
    streetNumber: '123',
    locality: 'Test City',
    administrativeAreaLevel1: 'Test State',
    postalCode: '12345',
    country: 'Test Country',
  },
  ...overrides,
})

const createMockCompanyMappings = (overrides: CompanyMapping[] = []) => [
  {
    id: 'test-id-1',
    tokenId: 'test-token',
    internalField: 'company.name' as const,
    hubspotField: 'name',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'test-id-2',
    tokenId: 'test-token',
    internalField: 'company.website' as const,
    hubspotField: 'website',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'test-id-3',
    tokenId: 'test-token',
    internalField: 'company.phone' as const,
    hubspotField: 'phone',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'test-id-4',
    tokenId: 'test-token',
    internalField: 'company.street' as const,
    hubspotField: 'street',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'test-id-5',
    tokenId: 'test-token',
    internalField: 'company.locality' as const,
    hubspotField: 'city',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'test-id-6',
    tokenId: 'test-token',
    internalField: 'company.region' as const,
    hubspotField: 'state',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'test-id-7',
    tokenId: 'test-token',
    internalField: 'company.postalCode' as const,
    hubspotField: 'zip',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'test-id-8',
    tokenId: 'test-token',
    internalField: 'company.country' as const,
    hubspotField: 'country',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  ...overrides,
]

describe('HubSpot Transformers', () => {
  describe('transformContactData', () => {
    describe('basic transformations', () => {
      it('should transform contact data with all fields', () => {
        const currentStatus: InternalLeadStatus = 'NEW'
        const result = transformContactData(
          createMockContactData(),
          createMockContactMappings(),
          currentStatus,
        )

        expect(result).toEqual({
          firstname: 'John',
          lastname: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          hs_lead_status: LEAD_STATUS_MAPPING[currentStatus],
        })
      })

      it('should handle missing contact fields', () => {
        const partialContactData = createMockContactData({
          lastname: null,
          phone: null,
        })
        const currentStatus: InternalLeadStatus = 'INTERESTED'
        const result = transformContactData(
          partialContactData,
          createMockContactMappings(),
          currentStatus,
        )

        expect(result).toEqual({
          firstname: 'John',
          email: 'john.doe@example.com',
          hs_lead_status: LEAD_STATUS_MAPPING[currentStatus],
        })
      })
    })

    describe('edge cases', () => {
      it('should handle empty string values', () => {
        const emptyContactData = createMockContactData({
          firstname: '',
          lastname: '',
          email: '',
          phone: '',
        })
        const currentStatus: InternalLeadStatus = 'NEW'
        const result = transformContactData(
          emptyContactData,
          createMockContactMappings(),
          currentStatus,
        )

        expect(result).toEqual({
          hs_lead_status: LEAD_STATUS_MAPPING[currentStatus],
        })
      })

      it('should handle special characters in contact fields', () => {
        const specialCharsData = createMockContactData({
          firstname: 'José',
          lastname: "O'Connor",
          email: 'test+label@example.com',
          phone: '+1 (555) 123-4567',
        })
        const currentStatus: InternalLeadStatus = 'NEW'
        const result = transformContactData(
          specialCharsData,
          createMockContactMappings(),
          currentStatus,
        )

        expect(result).toEqual({
          firstname: 'José',
          lastname: "O'Connor",
          email: 'test+label@example.com',
          phone: '+1 (555) 123-4567',
          hs_lead_status: LEAD_STATUS_MAPPING[currentStatus],
        })
      })

      it('should handle international phone numbers', () => {
        const internationalPhones = [
          '+44 20 7123 4567', // UK
          '+33 1 23 45 67 89', // France
          '+81 3-1234-5678', // Japan
        ]
        for (const phone of internationalPhones) {
          const result = transformContactData(
            createMockContactData({ phone }),
            createMockContactMappings(),
            'NEW',
          )
          expect(result.phone).toBe(phone)
        }
      })
    })

    describe('status handling', () => {
      it('should handle all possible lead statuses', () => {
        const statuses: InternalLeadStatus[] = [
          'NEW',
          'INTERESTED',
          'CONTACTED',
          'NO_ANSWER',
          'LOST',
        ]

        for (const status of statuses) {
          const result = transformContactData(
            createMockContactData(),
            createMockContactMappings(),
            status,
          )
          expect(result.hs_lead_status).toBe(LEAD_STATUS_MAPPING[status])
        }
      })

      it('should filter out non-contact mappings', () => {
        const mixedMappings = createMockContactMappings([
          {
            id: 'test-id-5',
            tokenId: 'test-token',
            internalField: 'status.INTERESTED' as const,
            hubspotField: 'some_field',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ])
        const currentStatus: InternalLeadStatus = 'NEW'
        const result = transformContactData(
          createMockContactData(),
          mixedMappings,
          currentStatus,
        )

        expect(result).toEqual({
          firstname: 'John',
          lastname: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          hs_lead_status: LEAD_STATUS_MAPPING[currentStatus],
        })
      })
    })
  })

  describe('transformCompanyData', () => {
    describe('basic transformations', () => {
      it('should transform company data with all fields', () => {
        const result = transformCompanyData(
          createMockPlace(),
          createMockCompanyMappings(),
        )

        expect(result).toEqual({
          ritchy_place_id: 'place-123',
          name: 'Test Company',
          website: 'testcompany.com',
          phone: '+1234567890',
          street: '123 123 Main St',
          city: 'Test City',
          state: 'Test State',
          zip: '12345',
          country: 'Test Country',
        })
      })
    })

    describe('address handling', () => {
      it('should handle missing address fields', () => {
        const partialPlace = createMockPlace({
          address: {
            street: 'Main St',
            locality: 'Test City',
            country: 'Test Country',
          },
        })

        const result = transformCompanyData(
          partialPlace,
          createMockCompanyMappings(),
        )

        expect(result).toEqual({
          ritchy_place_id: 'place-123',
          name: 'Test Company',
          website: 'testcompany.com',
          phone: '+1234567890',
          street: 'Main St',
          city: 'Test City',
          state: '',
          zip: '',
          country: 'Test Country',
        })
      })

      it('should handle international addresses', () => {
        const internationalPlace = createMockPlace({
          address: {
            street: 'Rue de la Paix',
            streetNumber: '1',
            locality: 'Paris',
            administrativeAreaLevel1: 'Île-de-France',
            postalCode: '75001',
            country: 'France',
          },
        })

        const result = transformCompanyData(
          internationalPlace,
          createMockCompanyMappings(),
        )

        expect(result).toEqual({
          ritchy_place_id: 'place-123',
          name: 'Test Company',
          website: 'testcompany.com',
          phone: '+1234567890',
          street: '1 Rue de la Paix',
          city: 'Paris',
          state: 'Île-de-France',
          zip: '75001',
          country: 'France',
        })
      })
    })

    describe('website handling', () => {
      it('should handle missing website', () => {
        const placeWithoutWebsite = createMockPlace({
          website: undefined,
        })

        const result = transformCompanyData(
          placeWithoutWebsite,
          createMockCompanyMappings(),
        )

        expect(result).toEqual({
          ritchy_place_id: 'place-123',
          name: 'Test Company',
          website: '',
          phone: '+1234567890',
          street: '123 123 Main St',
          city: 'Test City',
          state: 'Test State',
          zip: '12345',
          country: 'Test Country',
        })
      })

      it('should handle website with subdomains and paths', () => {
        const placeWithComplexWebsite = createMockPlace({
          website: 'https://subdomain.testcompany.com/path?query=value',
        })

        const result = transformCompanyData(
          placeWithComplexWebsite,
          createMockCompanyMappings(),
        )

        expect(result.website).toBe('subdomain.testcompany.com')
      })

      it('should handle invalid website URL', () => {
        const placeWithInvalidWebsite = createMockPlace({
          website: 'invalid-url',
        })

        expect(() =>
          transformCompanyData(
            placeWithInvalidWebsite,
            createMockCompanyMappings(),
          ),
        ).toThrow()
      })

      it('should handle special website formats', () => {
        const websites = [
          'http://test.com',
          'https://test.co.uk',
          'https://test-site.com',
          'https://test.com/path?query=value#hash',
        ]
        for (const website of websites) {
          const result = transformCompanyData(
            createMockPlace({ website }),
            createMockCompanyMappings(),
          )
          expect(result.website).toBe(new URL(website).hostname)
        }
      })
    })

    describe('phone handling', () => {
      it('should handle phone numbers in different formats', () => {
        const formats = [
          '(123) 456-7890',
          '123-456-7890',
          '123.456.7890',
          '+1 123-456-7890',
        ]

        for (const phone of formats) {
          const placeWithFormattedPhone = createMockPlace({ phone })
          const result = transformCompanyData(
            placeWithFormattedPhone,
            createMockCompanyMappings(),
          )
          expect(result.phone).toBe(phone)
        }
      })
    })

    describe('edge cases', () => {
      it('should handle duplicate mappings', () => {
        const duplicateMappings = createMockContactMappings([
          {
            id: 'test-id-5',
            tokenId: 'test-token',
            internalField: 'contact.firstname' as const,
            hubspotField: 'firstname_duplicate',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ])
        const result = transformContactData(
          createMockContactData(),
          duplicateMappings,
          'NEW',
        )
        expect(result.firstname).toBe('John')
        expect(result.firstname_duplicate).toBe('John')
      })
    })
  })
})
