const EMAIL_REGEX =
  /^[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/

/**
 * Validates if a string is a properly formatted email address
 * The format of an email address is local-part@domain, where the
 * local part may be up to 64 octets long and the domain may have a maximum of 255 octets.
 */
export const isValidEmail = (email: string): boolean => {
  if (!email) return false

  const emailParts = email.split('@')

  if (emailParts.length !== 2) return false

  const [account, address] = emailParts

  if (account.length > 64) return false
  if (address.length > 255) return false

  const domainParts = address.split('.')
  if (domainParts.some((part) => part.length > 63)) return false

  return EMAIL_REGEX.test(email)
}

/**
 * Normalizes an email address by removing URL parameters and extra components.
 * Returns null if the email is invalid.
 */
export const normalizeEmail = (email: string): string | null => {
  if (!email) return null

  // First check if the input string itself is a valid email
  if (isValidEmail(email)) {
    return email.toLowerCase()
  }

  // If not, try to extract email from URL parameters
  // Use capturing group to get the email part: (email)?param=value
  const urlParamMatch = email.match(/^([^?]+)\?/)
  if (urlParamMatch && isValidEmail(urlParamMatch[1])) {
    return urlParamMatch[1].toLowerCase()
  }

  return null
}
