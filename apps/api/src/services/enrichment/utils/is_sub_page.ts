export const isSubPage = (url: string): boolean => {
  // Remove protocol (http://, https://) if present
  const urlWithoutProtocol = url.replace(/^https?:\/\//, '')

  // Split by slashes and filter out empty strings
  const parts = urlWithoutProtocol.split('/').filter(Boolean)

  // If we have more than one part after filtering (meaning there's content after the slash),
  // then it's a subpage
  return parts.length > 1
}
