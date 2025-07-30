import { describe, expect, it } from 'vitest'
import { normalizeLinkedin } from '../normalize_linkedin'

describe('normalizeLinkedin', () => {
  // Valid personal profile URLs
  it('should normalize a valid LinkedIn personal profile URL', () => {
    const result = normalizeLinkedin('https://www.linkedin.com/in/username')
    expect(result).toEqual({
      name: 'username',
      url: 'https://www.linkedin.com/in/username',
      type: 'personal',
    })
  })

  it('should handle personal profile URLs without www', () => {
    const result = normalizeLinkedin('https://linkedin.com/in/username')
    expect(result).toEqual({
      name: 'username',
      url: 'https://www.linkedin.com/in/username',
      type: 'personal',
    })
  })

  // Valid company profile URLs
  it('should normalize a valid LinkedIn company profile URL', () => {
    const result = normalizeLinkedin(
      'https://www.linkedin.com/company/microsoft',
    )
    expect(result).toEqual({
      name: 'microsoft',
      url: 'https://www.linkedin.com/company/microsoft',
      type: 'company',
    })
  })

  it('should handle company profile URLs without www', () => {
    const result = normalizeLinkedin('https://linkedin.com/company/apple')
    expect(result).toEqual({
      name: 'apple',
      url: 'https://www.linkedin.com/company/apple',
      type: 'company',
    })
  })

  // Special characters and formats
  it('should handle names with special characters (personal)', () => {
    const result = normalizeLinkedin('https://linkedin.com/in/john-doe-123')
    expect(result).toEqual({
      name: 'john-doe-123',
      url: 'https://www.linkedin.com/in/john-doe-123',
      type: 'personal',
    })
  })

  it('should handle names with special characters (company)', () => {
    const result = normalizeLinkedin(
      'https://linkedin.com/company/company-name-123',
    )
    expect(result).toEqual({
      name: 'company-name-123',
      url: 'https://www.linkedin.com/company/company-name-123',
      type: 'company',
    })
  })

  // Invalid URLs
  it('should return null for main LinkedIn domain', () => {
    expect(normalizeLinkedin('https://linkedin.com')).toBeNull()
    expect(normalizeLinkedin('https://www.linkedin.com')).toBeNull()
  })

  it('should return null for school pages', () => {
    expect(normalizeLinkedin('https://linkedin.com/school/stanford')).toBeNull()
  })

  it('should return null for group pages', () => {
    expect(normalizeLinkedin('https://linkedin.com/groups/123456')).toBeNull()
  })

  it('should return null for pulse posts', () => {
    expect(
      normalizeLinkedin('https://linkedin.com/pulse/article-title'),
    ).toBeNull()
  })

  it('should return null for feed posts', () => {
    expect(
      normalizeLinkedin('https://linkedin.com/feed/update/123456'),
    ).toBeNull()
  })

  // Edge cases
  it('should return null for non-LinkedIn URLs', () => {
    expect(normalizeLinkedin('https://facebook.com/username')).toBeNull()
  })

  it('should return null for undefined or null input', () => {
    expect(normalizeLinkedin(undefined as unknown as string)).toBeNull()
    expect(normalizeLinkedin(null as unknown as string)).toBeNull()
  })

  it('should handle URLs with mixed case (personal)', () => {
    const result = normalizeLinkedin('https://LinkedIn.com/in/UserName')
    expect(result).toEqual({
      name: 'UserName',
      url: 'https://www.linkedin.com/in/UserName',
      type: 'personal',
    })
  })

  it('should handle URLs with mixed case (company)', () => {
    const result = normalizeLinkedin('https://LinkedIn.com/company/CompanyName')
    expect(result).toEqual({
      name: 'CompanyName',
      url: 'https://www.linkedin.com/company/CompanyName',
      type: 'company',
    })
  })

  it('should handle URLs with query parameters (personal)', () => {
    const result = normalizeLinkedin(
      'https://linkedin.com/in/username?originalSubdomain=fr',
    )
    expect(result).toEqual({
      name: 'username',
      url: 'https://www.linkedin.com/in/username',
      type: 'personal',
    })
  })

  it('should handle URLs with query parameters (company)', () => {
    const result = normalizeLinkedin(
      'https://linkedin.com/company/microsoft?trk=public_profile',
    )
    expect(result).toEqual({
      name: 'microsoft',
      url: 'https://www.linkedin.com/company/microsoft',
      type: 'company',
    })
  })
})
