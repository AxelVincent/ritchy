export const resolveUrl = (base: string, relative: string): string => {
  if (relative.startsWith('http://') || relative.startsWith('https://')) {
    return relative
  }

  if (relative.startsWith('//')) {
    const baseUrl = new URL(base)
    return `${baseUrl.protocol}${relative}`
  }

  try {
    return new URL(relative, base).href
  } catch (_) {
    return relative
  }
}
