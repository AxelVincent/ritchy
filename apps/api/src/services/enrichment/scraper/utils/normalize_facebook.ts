export type NormalizedFacebook = {
  username: string
  url: string
}

export function normalizeFacebook(url: string): NormalizedFacebook | null {
  // Return null if URL is not provided or doesn't contain facebook.com
  if (!url?.toLowerCase()?.includes('facebook.com')) {
    return null
  }

  // Normalize the URL to lowercase for consistent checks
  const lowercaseUrl = url.toLowerCase()

  // Return null for:
  // - Main facebook.com domain
  // - Posts URLs (/posts/)
  // - Photos URLs (/photos/)
  // - Pages URLs (/pages/)
  // - Groups URLs (/groups/)
  // - Events URLs (/events/)
  if (
    lowercaseUrl === 'https://facebook.com' ||
    lowercaseUrl === 'https://www.facebook.com' ||
    lowercaseUrl.includes('facebook.com/posts/') ||
    lowercaseUrl.includes('facebook.com/photos/') ||
    lowercaseUrl.includes('facebook.com/pages/') ||
    lowercaseUrl.includes('facebook.com/groups/') ||
    lowercaseUrl.includes('facebook.com/events/') ||
    lowercaseUrl.includes('facebook.com/help/') ||
    lowercaseUrl.includes('facebook.com/sharer.php/')
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
