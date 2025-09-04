import { extractPhonesFromText } from '../../../../utils/phone_utils'
import { extractEmailsFromText } from './extract_emails_from_text'

export const extractContactsFromText = (text: string) => {
  return {
    emails: extractEmailsFromText(text),
    phones: extractPhonesFromText(text),
  }
}
