import { describe, expect, it } from 'vitest'
import { isValidEmail, normalizeEmail } from '../normalize_email'

const validSupported = [
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@letters-in-local.org',
  '01234567890@numbers-in-local.net',
  "&'*+-./=?^_{}~@other-valid-characters-in-local.net",
  'mixed-1234-in-{+^}-local@sld.net',
  'a@single-character-in-local.org',
  'one-character-third-level@a.example.com',
  'single-character-in-sld@x.org',
  'local@dash-in-sld.com',
  'letters-in-sld@123.com',
  'one-letter-sld@x.org',
  'test@test--1.com',
  'uncommon-tld@sld.museum',
  'uncommon-tld@sld.travel',
  'uncommon-tld@sld.mobi',
  'country-code-tld@sld.uk',
  'country-code-tld@sld.rw',
  'local@sld.newTLD',
  'the-total-length@of-an-entire-address.cannot-be-longer-than-two-hundred-and-fifty-four-characters.and-this-address-is-254-characters-exactly.so-it-should-be-valid.and-im-going-to-add-some-more-words-here.to-increase-the-length-blah-blah-blah-blah-bla.org',
  'the-character-limit@for-each-part.of-the-domain.is-sixty-three-characters.this-is-exactly-sixty-three-characters-so-it-is-valid-blah-blah.com',
  'local@sub.domains.com',
  'backticks`are`legit@test.com',
  'digit-only-domain@123.com',
  'digit-only-domain-with-subdomain@sub.123.com',
  '`a@a.fr',
  '`aa@fr.com',
  'com@sil.c1m',
  't119037jskc_ihndkdoz@aakctgajathzffcsuqyjhgjuxnuulgnhxtnbquwtgxljfayeestsjdbalthtddy.lgtmsdhywswlameglunsaplsblljavswxrltovagexhtttodqedmicsekvpmpuu.pgjvdmvzyltpixvalfbktnnpjyjqswbfvtpbfsngqtmhgamhrbqqvyvlhqigggv.nxqglspfbwdhtfpibcrccvctmoxuxwlunghhwacjtrclgirrgppvshxvrzkoifl',
]

const validUnsupported = [
  '"quoted"@sld.com',
  '"\\e\\s\\c\\a\\p\\e\\d"@sld.com',
  '"quoted-at-sign@sld.org"@sld.com',
  '"escaped\\"quote"@sld.com',
  '"back\\slash"@sld.com',
  'punycode-numbers-in-tld@sld.xn--3e0b707e',
  'bracketed-IP-instead-of-domain@[127.0.0.1]',
]

const invalidSupported = [
  '@missing-local.org',
  '! #$%`|@invalid-characters-in-local.org',
  '(),:;`|@more-invalid-characters-in-local.org',
  '<>@[]\\`|@even-more-invalid-characters-in-local.org',
  '.local-starts-with-dot@sld.com',
  'local-ends-with-dot.@sld.com',
  'two..consecutive-dots@sld.com',
  'partially."quoted"@sld.com',
  'the-local-part-is-invalid-if-it-is-longer-than-sixty-four-characters@sld.net',
  'missing-sld@.com',
  'sld-starts-with-dashsh@-sld.com',
  'sld-ends-with-dash@sld-.com',
  'invalid-characters-in-sld@! "#$%(),/;<>_[]`|.org',
  'missing-dot-before-tld@com',
  'missing-tld@sld.',
  'invalid',
  'the-total-length@of-an-entire-address.cannot-be-longer-than-two-hundred-and-fifty-six-characters.and-this-address-is-257-characters-exactly.so-it-should-be-invalid.and-im-going-to-add-some-more-words-here.to-increase-the-length-blah-blah-blah-blah-blah-.org',
  'the-character-limit@for-each-part.of-the-domain.is-sixty-three-characters.this-is-exactly-sixty-four-characters-so-it-is-invalid-blah-blah.com',
  'missing-at-sign.net',
  'unbracketed-IP@127.0.0.1',
  'invalid-ip@127.0.0.1.26',
  'another-invalid-ip@127.0.0.256',
  'IP-and-port@127.0.0.1:25',
  'trailing-dots@test.de.',
  'dot-on-dot-in-domainname@te..st.de',
  'dot-first-in-domain@.test.de',
  'mg@ns.i',
  '.dot-start-and-end.@sil.com',
  'double@a@com',
  '',
  'tr119037jskc_ihndkdoz@d.aakctgajathzffcsuqyjhgjuxnuulgnhxtnbquwtgxljfayeestsjdbalthtddy.lgtmsdhywswlameglunsaplsblljavswxrltovagexhtttodqedmicsekvpmpuu.pgjvdmvzyltpixvalfbktnnpjyjqswbfvtpbfsngqtmhgamhrbqqvyvlhqigggv.nxqglspfbwdhtfpibcrccvctmoxuxwlunghhwacjtrclgirrgppvshxvrzkoifl',
]

describe('Email Validation', () => {
  describe('isValidEmail', () => {
    it('should validate supported email formats', () => {
      for (const email of validSupported) {
        expect(isValidEmail(email)).toBe(true)
      }
    })

    it('should reject invalid email formats', () => {
      for (const email of invalidSupported) {
        expect(isValidEmail(email)).toBe(false)
      }
    })

    it('should reject unsupported but technically valid email formats', () => {
      for (const email of validUnsupported) {
        expect(isValidEmail(email)).toBe(false)
      }
    })
  })

  describe('normalizeEmail', () => {
    it('should normalize valid emails', () => {
      const testCases = [
        {
          input: 'Test@Example.com',
          expected: 'test@example.com',
        },
        {
          input: 'user@domain.com?subject=Hello',
          expected: 'user@domain.com',
        },
        {
          input: 'email@domain.com?param1=value1&param2=value2',
          expected: 'email@domain.com',
        },
      ]

      for (const { input, expected } of testCases) {
        expect(normalizeEmail(input)).toBe(expected)
      }
    })

    it('should return null for invalid emails', () => {
      for (const email of invalidSupported) {
        expect(normalizeEmail(email)).toBeNull()
      }
    })

    it('should handle emails with URL parameters', () => {
      const email =
        'manoirsaintclair@gmail.com?subject=Demande%20d%27informations%20Manoir%20Saint%20Clair'
      expect(normalizeEmail(email)).toBe('manoirsaintclair@gmail.com')
    })
  })
})
