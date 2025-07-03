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

// Mock for useNavigate
const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

// Mock for useUserMe with default ESSENTIALS plan
const userMeMock = vi.fn().mockReturnValue({
  data: { plan: 'ESSENTIALS' },
})

vi.mock('@/api/queries/users/useUserMe', () => ({
  useUserMe: () => userMeMock(),
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
      fullName: 'Test User',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
    },
  }),
}))

describe('DataExport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userMeMock.mockReturnValue({
      data: { plan: 'ESSENTIALS' },
    })
  })

  it('renders export button with correct count and handles export for subscribed users', async () => {
    const mockData: SearchResult[] = [
      {
        id: '1',
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
        googleMapsUri: '',
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
        searchId: null,
        listId: null,
        enrichment: null,
        primaryEmail: 'test@example.com',
        primaryLinkedinSocial: null,
        primaryFacebookSocial: null,
        primaryInstagramSocial: null,
        primaryTwitterSocial: null,
        secondaryEmails: [],
        hubspotSynced: false,
      },
    ]

    render(<DataExport selectedRows={mockData} />)

    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Export to CSV (1)')

    // Click the button
    fireEvent.click(button)

    // Verify validateAndExportToCsv was called with correct parameters
    expect(validateAndExportToCsvMock).toHaveBeenCalledWith({
      data: mockData,
      filename: 'places.csv',
      schema: expect.any(Object), // searchResultSchema
      columns: expect.arrayContaining([
        expect.objectContaining({
          header: 'ID',
          field: 'id',
        }),
      ]),
    })
    expect(validateAndExportToCsvMock).not.toThrow()
  })

  it('shows toast notification for free users when trying to export', async () => {
    // Override the subscription mock for this test
    userMeMock.mockReturnValue({
      data: { plan: 'FREE' },
    })

    const mockData: SearchResult[] = [
      {
        id: '1',
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
          neighborhood: '',
          administrativeAreaLevel1: 'Test State',
          administrativeAreaLevel2: '',
        },
        googleMapsUri: '',
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
        searchId: null,
        listId: null,
        enrichment: null,
        primaryEmail: 'test@example.com',
        primaryLinkedinSocial: null,
        primaryFacebookSocial: null,
        primaryInstagramSocial: null,
        primaryTwitterSocial: null,
        secondaryEmails: [],
        hubspotSynced: false,
      },
    ]

    render(<DataExport selectedRows={mockData} />)

    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Export to CSV (1)')

    // Click the button
    fireEvent.click(button)

    // Verify toast was called and export function was not
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Export requires an ESSENTIALS plan or higher',
      }),
    )
    expect(validateAndExportToCsvMock).not.toHaveBeenCalled()
  })
})
