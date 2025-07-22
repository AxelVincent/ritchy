const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.bmp',
  '.tiff'
]

export const isImage = (url: string): boolean => {
  const lowercaseUrl = url.toLowerCase()
  return IMAGE_EXTENSIONS.some((ext) => lowercaseUrl.endsWith(ext))
}
