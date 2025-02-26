import type { SearchResult } from '@ritchy/types'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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
}))

// Import the validateAndExportToCsv mock to access it in tests
const validateAndExportToCsvMock = vi.fn()

// Update the mock implementation
vi.mock('@/lib/exportToCsv', () => ({
  validateAndExportToCsv: (...args: unknown[]) =>
    validateAndExportToCsvMock(...args),
}))

// Import the actual component and function
import * as DataExportModule from '../DataExport'
import { DataExport } from '../DataExport'

// Add spy for validateAllSearchResultFieldsHaveColumns
vi.spyOn(DataExportModule, 'validateAllSearchResultFieldsHaveColumns')

describe('DataExport', () => {
  it('renders export button with correct count and handles export', async () => {
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
      },
    ]

    render(<DataExport data={mockData} />)

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
})
