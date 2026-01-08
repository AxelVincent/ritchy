import { getDomain } from 'tldts'

export function getMainDomain(url: string): string {
  const domain = getDomain(url)
  if (!domain) {
    throw new Error(`Could not extract domain from URL: ${url}`)
  }
  return domain
}
