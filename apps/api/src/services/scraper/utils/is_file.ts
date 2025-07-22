export function isFile(url: string): boolean {
  const fileExtensions = [
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx'
  ]
  return fileExtensions.some((extension) => url.endsWith(extension))
}
