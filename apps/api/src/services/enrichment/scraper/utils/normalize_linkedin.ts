export type LinkedinProfileType = 'personal' | 'company'

export interface NormalizedLinkedin {
  name: string
  url: string
  type: LinkedinProfileType
}

export function normalizeLinkedin(url: string): NormalizedLinkedin | null {
  // Return null if URL is not provided or doesn't contain linkedin.com
  if (!url?.toLowerCase()?.includes('linkedin.com')) {
    return null
  }

  const lowercaseUrl = url.toLowerCase()

  if (
    lowercaseUrl === 'https://linkedin.com' ||
    lowercaseUrl === 'https://www.linkedin.com' ||
    lowercaseUrl.includes('linkedin.com/school/') ||
    lowercaseUrl.includes('linkedin.com/groups/') ||
    lowercaseUrl.includes('linkedin.com/pulse/') ||
    lowercaseUrl.includes('linkedin.com/feed/')
  ) {
    return null
  }

  // Try to match personal profile first (/in/)
  const personalMatch = url.match(/linkedin\.com\/in\/([\w-%.]+)/i)
  if (personalMatch?.[1]) {
    const name = personalMatch[1]
    if (
      name &&
      !['jobs', 'school', 'groups', 'pulse', 'feed'].includes(
        name.toLowerCase(),
      )
    ) {
      return {
        name,
        url: `https://www.linkedin.com/in/${name}`,
        type: 'personal',
      }
    }
  }

  // Try to match company profile (/company/)
  const companyMatch = url.match(/linkedin\.com\/company\/([\w-%.]+)/i)
  if (companyMatch?.[1]) {
    const name = companyMatch[1]
    if (
      name &&
      !['jobs', 'school', 'groups', 'pulse', 'feed'].includes(
        name.toLowerCase(),
      )
    ) {
      return {
        name,
        url: `https://www.linkedin.com/company/${name}`,
        type: 'company',
      }
    }
  }

  return null
}
