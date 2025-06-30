import { LEAD_STATUS_MAPPING } from '@ritchy/types'
import type {
  CompanyMapping,
  ContactMapping,
  InternalLeadStatus,
  PlaceBase,
} from '@ritchy/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Contact } from '../../../../db/schema'
import {
  createHubspotCompanyProperties,
  createHubspotCompanyPropertiesWithMappings,
  createHubspotContactProperties,
  createHubspotContactPropertiesWithMappings,
  createHubspotProperties,
} from '../hubspot_properties_builder'

// Mock the database and external dependencies
vi.mock('../../../../db/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('../manage_hubspot_field_mapping', () => ({
  manageHubspotFieldMappings: vi.fn().mockResolvedValue([]),
}))

/**
 * Test suite for HubSpot Properties Builder
 *
 * Tests the simplified, unified approach to creating HubSpot properties
 * from internal data structures with proper field mapping support.
 */

// Helper functions to reduce test code duplication
const createMockContactData = (
  overrides = {},
): Pick<Contact, 'firstname' | 'lastname' | 'email' | 'phone'> => ({
  firstname: 'John',
  lastname: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  ...overrides,
})

const createMockPlace = (overrides = {}): PlaceBase => ({
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

const createMockContactMappings = (): ContactMapping[] => [
  {
    id: 'test-id-1',
    tokenId: 'test-token',
    internalField: 'contact.firstname',
    hubspotField: 'firstname',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'test-id-2',
    tokenId: 'test-token',
    internalField: 'contact.lastname',
    hubspotField: 'lastname',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'test-id-3',
    tokenId: 'test-token',
    internalField: 'contact.email',
    hubspotField: 'email',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'test-id-4',
    tokenId: 'test-token',
    internalField: 'contact.phone',
    hubspotField: 'phone',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const createMockCompanyMappings = (): CompanyMapping[] => [
  {
    id: 'test-id-1',
    tokenId: 'test-token',
    internalField: 'company.name',
    hubspotField: 'name',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'test-id-2',
    tokenId: 'test-token',
    internalField: 'company.website',
    hubspotField: 'website',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'test-id-3',
    tokenId: 'test-token',
    internalField: 'company.phone',
    hubspotField: 'phone',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'test-id-4',
    tokenId: 'test-token',
    internalField: 'company.street',
    hubspotField: 'street',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'test-id-5',
    tokenId: 'test-token',
    internalField: 'company.locality',
    hubspotField: 'city',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'test-id-6',
    tokenId: 'test-token',
    internalField: 'company.region',
    hubspotField: 'state',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'test-id-7',
    tokenId: 'test-token',
    internalField: 'company.postalCode',
    hubspotField: 'zip',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'test-id-8',
    tokenId: 'test-token',
    internalField: 'company.country',
    hubspotField: 'country',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

interface MockDb {
  select: ReturnType<typeof vi.fn>
  from: ReturnType<typeof vi.fn>
  where: ReturnType<typeof vi.fn>
}

describe('HubSpot Properties Builder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createHubspotContactProperties', () => {
    describe('basic transformations', () => {
      it('should transform contact data with all fields', () => {
        const currentStatus: InternalLeadStatus = 'NEW'
        const result = createHubspotContactProperties(
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
        const result = createHubspotContactProperties(
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
        const result = createHubspotContactProperties(
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
        const result = createHubspotContactProperties(
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
          const result = createHubspotContactProperties(
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
          const result = createHubspotContactProperties(
            createMockContactData(),
            createMockContactMappings(),
            status,
          )
          expect(result.hs_lead_status).toBe(LEAD_STATUS_MAPPING[status])
        }
      })

      it('should filter out non-contact mappings', () => {
        const mixedMappings = [
          ...createMockContactMappings(),
          {
            id: 'test-id-5',
            tokenId: 'test-token',
            internalField: 'status.INTERESTED' as const,
            hubspotField: 'some_field',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]
        const currentStatus: InternalLeadStatus = 'NEW'
        const result = createHubspotContactProperties(
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

  describe('createHubspotCompanyProperties', () => {
    describe('basic transformations', () => {
      it('should transform company data with all fields', () => {
        const result = createHubspotCompanyProperties(
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

        const result = createHubspotCompanyProperties(
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

        const result = createHubspotCompanyProperties(
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

        const result = createHubspotCompanyProperties(
          placeWithoutWebsite,
          createMockCompanyMappings(),
        )

        expect(result).toEqual({
          ritchy_place_id: 'place-123',
          name: 'Test Company',
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

        const result = createHubspotCompanyProperties(
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
          createHubspotCompanyProperties(
            placeWithInvalidWebsite,
            createMockCompanyMappings(),
          ),
        ).toThrow('Invalid website URL: invalid-url')
      })

      it('should handle special website formats', () => {
        const websites = [
          'http://test.com',
          'https://test.co.uk',
          'https://test-site.com',
          'https://test.com/path?query=value#hash',
        ]
        for (const website of websites) {
          const result = createHubspotCompanyProperties(
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
          const result = createHubspotCompanyProperties(
            placeWithFormattedPhone,
            createMockCompanyMappings(),
          )
          expect(result.phone).toBe(phone)
        }
      })
    })
  })

  describe('createHubspotContactPropertiesWithMappings', () => {
    it('should retrieve mappings and create contact properties', async () => {
      // Mock the database to return contact mappings
      const { db: mockDb } = await vi.importMock<{ db: unknown }>(
        '../../../../db/db',
      )
      const mockDbAsMockDb = mockDb as MockDb
      mockDbAsMockDb.where.mockResolvedValue(createMockContactMappings())

      const result = await createHubspotContactPropertiesWithMappings(
        'token-123',
        createMockContactData(),
        'NEW',
      )

      expect(result).toEqual({
        firstname: 'John',
        lastname: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        hs_lead_status: LEAD_STATUS_MAPPING.NEW,
      })

      expect(mockDbAsMockDb.select).toHaveBeenCalled()
    })

    it('should create mappings if none exist', async () => {
      // Mock empty mappings first, then return mappings after creation
      const { db: mockDb } = await vi.importMock<{ db: unknown }>(
        '../../../../db/db',
      )
      const mockDbAsMockDb = mockDb as MockDb
      mockDbAsMockDb.where
        .mockResolvedValueOnce([]) // First call returns empty
        .mockResolvedValueOnce(createMockContactMappings()) // Second call returns mappings

      const result = await createHubspotContactPropertiesWithMappings(
        'token-123',
        createMockContactData(),
        'INTERESTED',
      )

      expect(result).toEqual({
        firstname: 'John',
        lastname: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        hs_lead_status: LEAD_STATUS_MAPPING.INTERESTED,
      })
    })
  })

  describe('createHubspotCompanyPropertiesWithMappings', () => {
    it('should retrieve mappings and create company properties', async () => {
      // Mock the database to return company mappings
      const { db: mockDb } = await vi.importMock<{ db: unknown }>(
        '../../../../db/db',
      )
      const mockDbAsMockDb = mockDb as MockDb
      mockDbAsMockDb.where.mockResolvedValue(createMockCompanyMappings())

      const result = await createHubspotCompanyPropertiesWithMappings(
        'token-123',
        createMockPlace(),
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

      expect(mockDbAsMockDb.select).toHaveBeenCalled()
    })

    it('should create mappings if none exist', async () => {
      // Mock empty mappings first, then return mappings after creation
      const { db: mockDb } = await vi.importMock<{ db: unknown }>(
        '../../../../db/db',
      )
      const mockDbAsMockDb = mockDb as MockDb
      mockDbAsMockDb.where
        .mockResolvedValueOnce([]) // First call returns empty
        .mockResolvedValueOnce(createMockCompanyMappings()) // Second call returns mappings

      const result = await createHubspotCompanyPropertiesWithMappings(
        'token-123',
        createMockPlace(),
      )

      expect(result.ritchy_place_id).toBe('place-123')
    })
  })

  describe('createHubspotProperties', () => {
    it('should handle status field updates', async () => {
      const { db: mockDb } = await vi.importMock<{ db: unknown }>(
        '../../../../db/db',
      )
      const mockDbAsMockDb = mockDb as MockDb
      const mockMappings = [
        {
          id: 'mapping-1',
          tokenId: 'token-123',
          internalField: 'status.INTERESTED',
          hubspotField: 'hs_lead_status',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      mockDbAsMockDb.where.mockResolvedValue(mockMappings)

      const result = await createHubspotProperties('token-123', [
        { internalField: 'status.INTERESTED', value: 'INTERESTED' },
      ])

      expect(result).toEqual({
        hs_lead_status: LEAD_STATUS_MAPPING.INTERESTED,
      })
    })

    it('should return empty object when no mappings found', async () => {
      const { db: mockDb } = await vi.importMock<{ db: unknown }>(
        '../../../../db/db',
      )
      const mockDbAsMockDb = mockDb as MockDb
      mockDbAsMockDb.where.mockResolvedValue([])

      const result = await createHubspotProperties('token-123', [
        { internalField: 'status.NEW', value: 'NEW' },
      ])

      expect(result).toEqual({})
    })
  })
})
