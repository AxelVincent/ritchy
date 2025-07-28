export const cleanUrl = (urlString: string): string => {
  try {
    const urlObj = new URL(urlString)

    urlObj.hash = ''

    let path = urlObj.pathname
    path = path.endsWith('/') ? path.slice(0, -1) : path
    urlObj.pathname = path

    return urlObj.toString()
  } catch {
    return urlString
  }
}
