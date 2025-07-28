import { findPhoneNumbersInText } from 'libphonenumber-js'

const EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/g

const extractEmails = (text: string): string[] => {
  return Array.from(text.matchAll(EMAIL_REGEX), (match) => match[0])
}

const extractPhones = (text: string): string[] => {
  const phoneObjects = findPhoneNumbersInText(text)
  const phones = phoneObjects.map((phone) => {
    return phone.number.number
  })
  return phones.filter((phone) => phone.length > 5)
}

export const extractContactsFromText = (text: string) => {
  return {
    emails: extractEmails(text),
    phones: extractPhones(text),
  }
}
