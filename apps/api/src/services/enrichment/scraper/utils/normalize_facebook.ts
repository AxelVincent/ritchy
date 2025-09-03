export type NormalizedFacebook = {
  username: string
  url: string
}

const FACEBOOK_EXCLUDED_PATHS = [
  'posts/',
  'p/',
  'photos/',
  'pages/',
  'groups/',
  'events/',
  'help/',
  'sharer.php/',
  'profile.php',
  'sharer',
  'stories',
  'photo.php',
  'ad_campaign',
  'people',
  'pg',
  'l.php',
  'Prem',
] as const

export function normalizeFacebook(url: string): NormalizedFacebook | null {
  // Return null if URL is not provided or doesn't contain facebook.com
  if (!url?.toLowerCase()?.includes('facebook.com')) {
    return null
  }

  // Normalize the URL to lowercase for consistent checks
  const lowercaseUrl = url.toLowerCase()

  // Return null for main facebook.com domain
  if (
    lowercaseUrl === 'https://facebook.com' ||
    lowercaseUrl === 'https://www.facebook.com'
  ) {
    return null
  }

  // Check if URL contains any of the excluded paths
  if (
    FACEBOOK_EXCLUDED_PATHS.some((path) =>
      lowercaseUrl.includes(`facebook.com/${path}`),
    )
  ) {
    return null
  }

  // Extract username using regex, excluding special paths
  const match = url.match(
    /facebook\.com\/(?!(?:posts|photos|pages|groups|events)\/)([\w.]+)/i,
  )
  if (!match || !match[1]) {
    return null
  }

  const username = match[1]

  // Additional validation to ensure username looks legitimate
  if (
    username === '' ||
    ['posts', 'photos', 'pages', 'groups', 'events'].includes(
      username.toLowerCase(),
    )
  ) {
    return null
  }

  return {
    username,
    url: `https://www.facebook.com/${username}`,
  }
}
