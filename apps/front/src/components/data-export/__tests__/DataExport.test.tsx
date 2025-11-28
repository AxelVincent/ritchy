import type { Plan, SearchModel, SearchResult } from '@ritchy/types'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// First, declare all mocks
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    getQueryData: vi.fn(),
    clear: vi.fn(),
  }),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
  toast: vi.fn(),
}))

// Mock for isModelAvailable
vi.mock('@/lib/subscription', () => ({
  isModelAvailable: (plan: Plan, model: SearchModel) => {
    if (plan === 'FREE') return model === 'ENHANCED'
    if (plan === 'ESSENTIALS') return ['ENHANCED'].includes(model)
    if (plan === 'PRO') return true
    return model === 'ENHANCED'
  },
}))

// Import the validateAndExportToCsv mock to access it in tests
const validateAndExportToCsvMock = vi.fn()

// Update the mock implementation
vi.mock('@/lib/exportToCsv', () => ({
  validateAndExportToCsv: (...args: unknown[]) =>
    validateAndExportToCsvMock(...args),
}))

import { toast } from '@/hooks/use-toast'
// Import the actual component and function
import * as DataExportModule from '../DataExport'
import { DataExport } from '../DataExport'

// Add spy for validateAllSearchResultFieldsHaveColumns
vi.spyOn(DataExportModule, 'validateAllSearchResultFieldsHaveColumns')

// Mock for useUser from Clerk
vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-id',
      firstName: 'Test',
      lastName: 'User',
      primaryEmailAddress: {
        emailAddress: 'test@example.com',
      },
    },
  }),
}))

// Helper function to create mock data
const createMockSearchResult = (): SearchResult => ({
  id: '1',
  sourceId: '1',
  sourceUrl: '',
  source: 'google',
  name: 'Test Place',
  website: 'https://test.com',
  types: ['restaurant'],
  address: {
    formattedAddress: '123 Test St',
    shortFormattedAddress: '',
    country: 'US',
    locality: 'Test City',
    sublocality: '',
    postalCode: '12345',
    postalCodeSuffix: '',
    plusCode: '',
    street: 'Test St',
    streetNumber: '',
    neighborhood: '',
    administrativeAreaLevel1: 'Test State',
    administrativeAreaLevel2: '',
    administrativeAreaLevel3: '',
  },
  phone: '',
  rating: undefined,
  ratingCount: undefined,
  location: { latitude: 0, longitude: 0 },
  primaryType: 'restaurant',
  priceLevel: undefined,
  priceRange: undefined,
  openingHours: undefined,
  utcOffsetMinutes: 0,
  status: null,
  listId: null,
  lists: [],
  notes: [],
  domainRegisteredAt: new Date(),
  contactEmails: [
    {
      id: '1',
      email: 'test@example.com',
      isPrimary: true,
      contactId: '1',
      isVerified: true,
      source: 'test',
      quality: 'good',
      result: 'ok',
      role: false,
      free: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  contactPhones: [],
  contactLinkedins: [
    {
      url: 'https://test.com',
      socialMediaPlatform: 'LINKEDIN',
      isPrimary: true,
      contactId: '1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  contactFacebooks: [
    {
      url: 'https://test.com',
      socialMediaPlatform: 'FACEBOOK',
      contactId: '1',
      isPrimary: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  contactInstagrams: [
    {
      url: 'https://test.com',
      socialMediaPlatform: 'INSTAGRAM',
      contactId: '1',
      isPrimary: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  shortDescription: 'Test Short Description',
  isDeleted: false,
  enrichedStatus: 'RECENTLY_ENRICHED',
  companyWorkforceRange: null,
  companyDateOfCreation: null,
  companyActivities: [],
  companyOfficers: [],
  companyTechnologies: [],
})

describe('DataExport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders export button with correct count and handles export', async () => {
    const mockData: SearchResult[] = [createMockSearchResult()]

    render(<DataExport selectedRows={mockData} />)

    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Export to CSV (1)')

    // Click the button
    fireEvent.click(button)

    // Verify validateAndExportToCsv was called with correct parameters
    expect(validateAndExportToCsvMock).toHaveBeenCalledWith({
      data: expect.any(Array),
      filename: 'places.csv',
      schema: expect.any(Object),
      columns: expect.arrayContaining([
        expect.objectContaining({
          header: 'ID',
          field: 'id',
        }),
      ]),
    })
    expect(validateAndExportToCsvMock).not.toThrow()
  })

  it('allows free users to export data', async () => {
    const mockData: SearchResult[] = [createMockSearchResult()]

    render(<DataExport selectedRows={mockData} />)

    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Export to CSV (1)')

    // Click the button
    fireEvent.click(button)

    // Verify export function was called (no blocking for free users)
    expect(validateAndExportToCsvMock).toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Export successful',
        description: 'Your data has been exported to CSV',
      }),
    )
  })
})
