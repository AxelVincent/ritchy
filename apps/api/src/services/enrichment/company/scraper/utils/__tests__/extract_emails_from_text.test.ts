import { describe, expect, it } from 'vitest'
import { extractEmailsFromText } from '../extract_emails_from_text'

describe('extractEmailsFromText', () => {
  describe('basic functionality', () => {
    it('should extract simple email addresses', () => {
      const text = 'Contact us at user@domain.com or support@company.com'
      const emails = extractEmailsFromText(text)
      expect(emails).toEqual(['user@domain.com', 'support@company.com'])
    })

    it('should handle empty input', () => {
      expect(extractEmailsFromText('')).toEqual([])
      expect(extractEmailsFromText(null as unknown as string)).toEqual([])
      expect(extractEmailsFromText(undefined as unknown as string)).toEqual([])
    })

    it('should handle text without emails', () => {
      const text = 'This is a text without any email addresses'
      expect(extractEmailsFromText(text)).toEqual([])
    })
  })

  describe('email format handling', () => {
    it('should extract emails from formatted strings', () => {
      const text = '"John Doe" <john.doe@company.com>'
      const emails = extractEmailsFromText(text)
      expect(emails).toEqual(['john.doe@company.com'])
    })

    it('should handle multiple emails in different formats', () => {
      const text = `
        Basic email: user1@domain.com
        With display name: "User Two" <user2@domain.com>
        With brackets: <user3@domain.com>
        Mixed format: contact@domain.com, "Support" <support@company.com>
      `
      const emails = extractEmailsFromText(text)
      expect(emails).toEqual([
        'user1@domain.com',
        'user2@domain.com',
        'user3@domain.com',
        'contact@domain.com',
        'support@company.com',
      ])
    })
  })

  describe('filtering', () => {
    it('should filter out banned email patterns by default', () => {
      const text = `
        Valid: user@company.com
        Sentry: errors@sentry.io
        No-reply: noreply@company.com
        Test: test@test.com
        Local: internal@company.local
      `
      const emails = extractEmailsFromText(text)
      expect(emails).toEqual(['user@company.com'])
    })
  })

  describe('validation', () => {
    it('should validate email format', () => {
      const invalidEmails = [
        'not.an.email',
        '@incomplete.com',
        'no.domain@',
        'double@@domain.com',
        'missing.dot@domain',
      ]
      const text = invalidEmails.join(', ')
      expect(extractEmailsFromText(text)).toEqual([])
    })

    it('should handle non-TLD domains', () => {
      const text = 'user@localhost'
      const emails = extractEmailsFromText(text)
      expect(emails).toEqual([])
    })

    it('should handle special characters in local part', () => {
      const text = `
        first.last@domain.com
        first+last@domain.com
        first-last@domain.com
        first_last@domain.com
        first!last@domain.com
        first#last@domain.com
        first$last@domain.com
        first%last@domain.com
        first&last@domain.com
        first'last@domain.com
        first*last@domain.com
        first=last@domain.com
        first?last@domain.com
        first^last@domain.com
        first{last@domain.com
        first|last@domain.com
        first}last@domain.com
        first~last@domain.com
      `
      const emails = extractEmailsFromText(text)
      expect(emails).toContain('first.last@domain.com')
      expect(emails).toContain('first+last@domain.com')
      expect(emails).toContain('first-last@domain.com')
      expect(emails).toContain('first_last@domain.com')
    })
  })

  describe('complex scenarios', () => {
    it('should extract emails from mailto links', () => {
      const text = `
        Click here: <a href="mailto:support@company.com">Email Support</a>
        Or here: mailto:sales@company.com?subject=Inquiry
        Complex: mailto:info@company.com?subject=Hello&body=How%20are%20you
      `
      const emails = extractEmailsFromText(text)
      expect(emails).toEqual([
        'support@company.com',
        'sales@company.com',
        'info@company.com',
      ])
    })

    it('should extract emails from HTML content', () => {
      const text = `
        <div class="contact">
          <span class="email" data-email="hidden@company.com">Contact Us</span>
          <a href="/contact">support@company.com</a>
          <!-- Comment with email: dev@company.com -->
          <script>var mail = 'js@company.com';</script>
        </div>
      `
      const emails = extractEmailsFromText(text)
      expect(emails).toEqual([
        'hidden@company.com',
        'support@company.com',
        'dev@company.com',
        'js@company.com',
      ])
    })

    it('should handle emails with subjects and parameters', () => {
      const text = `
        Email with subject: user@company.com?subject=Hello
        With multiple params: info@company.com?subject=Question&cc=other@company.com
        Complex URL: https://site.com/form?email=contact@company.com&type=support
      `
      const emails = extractEmailsFromText(text)
      expect(emails).toEqual([
        'user@company.com',
        'info@company.com',
        'other@company.com',
        'contact@company.com',
      ])
    })

    it('should handle obfuscated email formats', () => {
      const text = `
        Spaced: u s e r @ company.com
        [at] format: user[at]company.com
        {at} format: admin{at}company.com
        Dot replaced: user@company[dot]com
        Mixed: user[at]company[dot]com
      `
      // Note: Our current implementation doesn't handle these obfuscated formats
      // This test documents this limitation
      const emails = extractEmailsFromText(text)
      expect(emails).toEqual([])
    })

    it('should handle emails in complex text structures', () => {
      const text = `
        From: "John Doe" <john@company.com>
        To: jane@company.com, "Support Team" <support@company.com>
        Cc: admin@company.com
        Bcc: "Security" <security@company.com>
        Reply-To: replies@company.com
        Subject: Meeting
        
        Please contact us at:
        * Primary: contact@company.com
        * Backup: backup@company.com
        
        Best regards,
        --
        Marketing Team
        marketing@company.com
      `
      const emails = extractEmailsFromText(text)
      expect(emails).toEqual([
        'john@company.com',
        'jane@company.com',
        'support@company.com',
        'admin@company.com',
        'security@company.com',
        'replies@company.com',
        'contact@company.com',
        'backup@company.com',
        'marketing@company.com',
      ])
    })
  })
})
