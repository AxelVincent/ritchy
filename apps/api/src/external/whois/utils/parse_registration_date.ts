export const parseRegistrationDate = (dateString: string): string | null => {
  if (!dateString || typeof dateString !== 'string') {
    return null
  }

  // Clean the date string - remove time components and extra whitespace
  const cleanDateString = dateString.split(' ')[0].trim()

  // Try multiple date formats with validation
  const formats = [
    // YYYY-MM-DD (ISO format)
    {
      regex: /^(\d{4})-(\d{2})-(\d{2})$/,
      parser: (matches: RegExpMatchArray): Date | null => {
        const [, year, month, day] = matches
        const yearNum = Number.parseInt(year, 10)
        const monthNum = Number.parseInt(month, 10)
        const dayNum = Number.parseInt(day, 10)

        // Validate reasonable ranges
        if (yearNum < 1900 || yearNum > new Date().getFullYear() + 1)
          return null
        if (monthNum < 1 || monthNum > 12) return null
        if (dayNum < 1 || dayNum > 31) return null

        const date = new Date(yearNum, monthNum - 1, dayNum)
        return date.getTime() && date.getFullYear() === yearNum ? date : null
      },
    },
    // YYYY/MM/DD
    {
      regex: /^(\d{4})\/(\d{2})\/(\d{2})$/,
      parser: (matches: RegExpMatchArray): Date | null => {
        const [, year, month, day] = matches
        const yearNum = Number.parseInt(year, 10)
        const monthNum = Number.parseInt(month, 10)
        const dayNum = Number.parseInt(day, 10)

        if (yearNum < 1900 || yearNum > new Date().getFullYear() + 1)
          return null
        if (monthNum < 1 || monthNum > 12) return null
        if (dayNum < 1 || dayNum > 31) return null

        const date = new Date(yearNum, monthNum - 1, dayNum)
        return date.getTime() && date.getFullYear() === yearNum ? date : null
      },
    },
    // MM/DD/YYYY (US format) - try first
    {
      regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      parser: (matches: RegExpMatchArray): Date | null => {
        const [, month, day, year] = matches
        const yearNum = Number.parseInt(year, 10)
        const monthNum = Number.parseInt(month, 10)
        const dayNum = Number.parseInt(day, 10)

        if (yearNum < 1900 || yearNum > new Date().getFullYear() + 1)
          return null
        if (monthNum < 1 || monthNum > 12) return null
        if (dayNum < 1 || dayNum > 31) return null

        const date = new Date(yearNum, monthNum - 1, dayNum)
        return date.getTime() && date.getFullYear() === yearNum ? date : null
      },
    },
    // DD/MM/YYYY (European format) - try if MM/DD/YYYY fails
    {
      regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      parser: (matches: RegExpMatchArray): Date | null => {
        const [, day, month, year] = matches
        const yearNum = Number.parseInt(year, 10)
        const monthNum = Number.parseInt(month, 10)
        const dayNum = Number.parseInt(day, 10)

        if (yearNum < 1900 || yearNum > new Date().getFullYear() + 1)
          return null
        if (monthNum < 1 || monthNum > 12) return null
        if (dayNum < 1 || dayNum > 31) return null

        const date = new Date(yearNum, monthNum - 1, dayNum)
        return date.getTime() && date.getFullYear() === yearNum ? date : null
      },
    },
  ]

  // Try each format
  for (const format of formats) {
    const matches = cleanDateString.match(format.regex)
    if (matches) {
      const parsedDate = format.parser(matches)
      if (parsedDate) {
        return parsedDate.toISOString().split('T')[0]
      }
    }
  }

  // Fallback: try native Date parsing for other formats
  const fallbackDate = new Date(cleanDateString)
  if (fallbackDate.getTime() && !Number.isNaN(fallbackDate.getTime())) {
    // Additional validation for fallback parsing
    const year = fallbackDate.getFullYear()
    if (year >= 1900 && year <= new Date().getFullYear() + 1) {
      return fallbackDate.toISOString().split('T')[0]
    }
  }

  return null
}
