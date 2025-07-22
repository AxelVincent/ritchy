export function normalizeInstagram(url: string): {
  username: string
  url: string
} | null {
  if (!url?.includes('instagram.com')) {
    return null
  }

  const username = url.replace(/.*instagram\.com\/(_u\/)?([^/?#&]+).*/, '$2')
  return {
    username,
    url: `https://www.instagram.com/${username}`
  }
}
