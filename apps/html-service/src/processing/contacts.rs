use crate::models::ExtractedContacts;
use lol_html::{element, rewrite_str, RewriteStrSettings};
use once_cell::sync::Lazy;
use regex::Regex;
use std::collections::HashSet;
use std::sync::{Arc, Mutex};

/// Email regex pattern matching the Node.js implementation
/// Matches standard email format: local@domain.tld
static EMAIL_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+",
    )
    .unwrap()
});

/// URL email pattern: matches emails in URL parameters like ?email=user@example.com
static URL_EMAIL_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"[?&][^&=]*=([^&\s]+@[^&\s]+)").unwrap());

/// Phone regex pattern - matches international and local formats
/// Requires either:
/// 1. International format starting with + (e.g., +33 6 12 34 56 78, +1 555 123 4567)
/// 2. French format starting with 0 (e.g., 06 12 34 56 78, 01 23 45 67 89)
/// 3. US format with area code in parens (e.g., (555) 123-4567)
static PHONE_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(concat!(
        r"(?:",
        // International format: +XX followed by 8-14 more digits with optional separators
        // Handles formats like +33 6 12 34 56 78 or +1-555-123-4567
        r"\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{2,4}(?:[-.\s]?\d{2,4})?",
        r"|",
        // French mobile/landline: starts with 0, followed by 9 digits (with optional separators)
        r"0[1-9][-.\s]?\d{2}[-.\s]?\d{2}[-.\s]?\d{2}[-.\s]?\d{2}",
        r"|",
        // US format with area code in parens: (XXX) XXX-XXXX
        r"\(\d{3}\)[-.\s]?\d{3}[-.\s]?\d{4}",
        r")"
    ))
    .unwrap()
});

/// Banned email patterns that indicate spam, test, or internal emails
const BANNED_EMAIL_PATTERNS: &[&str] = &[
    // Sentry error tracking
    "@sentry.",
    "@sentry-",
    "sentry.io",
    "@ingest.sentry.io",
    // Test/example domains
    "@example.",
    "@test.",
    ".local",
    "localhost",
    // No-reply addresses
    "noreply@",
    "no-reply@",
    "do-not-reply@",
    "donotreply@",
    // Marketing/transactional services
    "wixpress",
    "@mailchimp.",
    "@sendgrid.",
    "@mandrill.",
    "@postmarkapp.",
    "@sparkpost.",
    // System addresses
    "unsubscribe@",
    "bounce@",
    "postmaster@",
    "mailer-daemon@",
    "abuse@",
    "admin@",
    "webmaster@",
];

/// Minimum/maximum phone number length (digits only)
const MIN_PHONE_DIGITS: usize = 9;
const MAX_PHONE_DIGITS: usize = 15;

/// Patterns that indicate a number is not a phone (e.g., placeholder numbers)
const INVALID_PHONE_PATTERNS: &[&str] = &[
    "0000000", // Likely placeholder number
    "1111111", // Likely placeholder number
];

/// Extract contacts (emails and phones) from text content.
///
/// This mirrors the behavior of the Node.js `extractContactsFromText` function:
/// - Extracts emails using regex pattern matching
/// - Filters out banned/spam email patterns
/// - Extracts phone numbers with basic validation
pub fn extract_contacts(text: &str) -> ExtractedContacts {
    let emails = extract_emails(text);
    let phones = extract_phones(text);

    ExtractedContacts { emails, phones }
}

/// Extract emails from text, filtering out banned patterns
fn extract_emails(text: &str) -> Vec<String> {
    let mut found: HashSet<String> = HashSet::new();

    // Direct email matches
    for cap in EMAIL_REGEX.find_iter(text) {
        let email = clean_email(cap.as_str());
        if is_valid_email(&email) && !is_banned_email(&email) {
            found.insert(email);
        }
    }

    // URL parameter email matches
    for cap in URL_EMAIL_REGEX.captures_iter(text) {
        if let Some(email_match) = cap.get(1) {
            let email = clean_email(email_match.as_str());
            if is_valid_email(&email) && !is_banned_email(&email) {
                found.insert(email);
            }
        }
    }

    found.into_iter().collect()
}

/// Clean up an email address
fn clean_email(email: &str) -> String {
    email
        .trim()
        .to_lowercase()
        .trim_start_matches("mailto:")
        .replace(['\'', '"', '<', '>'], "")
        .trim_end_matches([';', ','])
        .split('?')
        .next()
        .unwrap_or("")
        .split('&')
        .next()
        .unwrap_or("")
        .to_string()
}

/// Basic email validation (format check)
fn is_valid_email(email: &str) -> bool {
    // Must have exactly one @
    let at_count = email.chars().filter(|c| *c == '@').count();
    if at_count != 1 {
        return false;
    }

    // Must have at least one . after @
    if let Some(at_pos) = email.find('@') {
        let domain = &email[at_pos + 1..];
        if !domain.contains('.') || domain.starts_with('.') || domain.ends_with('.') {
            return false;
        }
    }

    // Must not be too short
    if email.len() < 5 {
        return false;
    }

    true
}

/// Check if email matches banned patterns
fn is_banned_email(email: &str) -> bool {
    let lower = email.to_lowercase();
    BANNED_EMAIL_PATTERNS
        .iter()
        .any(|pattern| lower.contains(pattern))
}

/// Extract phone numbers from text
fn extract_phones(text: &str) -> Vec<String> {
    let mut found: HashSet<String> = HashSet::new();

    for cap in PHONE_REGEX.find_iter(text) {
        let phone = normalize_phone(cap.as_str());
        if is_valid_phone(&phone) {
            found.insert(phone);
        }
    }

    found.into_iter().collect()
}

/// Normalize phone number to digits only (with leading +)
fn normalize_phone(phone: &str) -> String {
    let mut result = String::new();
    let mut chars = phone.chars().peekable();

    // Preserve leading +
    if chars.peek() == Some(&'+') {
        result.push('+');
        chars.next();
    }

    // Keep only digits
    for c in chars {
        if c.is_ascii_digit() {
            result.push(c);
        }
    }

    result
}

/// Validate phone number by digit count and pattern
fn is_valid_phone(phone: &str) -> bool {
    let digits: String = phone.chars().filter(|c| c.is_ascii_digit()).collect();

    // Check digit count
    if digits.len() < MIN_PHONE_DIGITS || digits.len() > MAX_PHONE_DIGITS {
        return false;
    }

    // Check for invalid patterns (test numbers, placeholders)
    for pattern in INVALID_PHONE_PATTERNS {
        if digits.contains(pattern) {
            return false;
        }
    }

    // French numbers starting with 0 must be exactly 10 digits
    if digits.starts_with('0') && digits.len() != 10 {
        return false;
    }

    // International numbers starting with country code must have valid length
    // Most country codes are 1-3 digits, followed by 8-12 digit subscriber number
    if phone.starts_with('+') {
        // After stripping +, we should have country code (1-3) + subscriber (7-12)
        // Total: 8-15 digits
        if digits.len() < 8 {
            return false;
        }
    }

    true
}

/// Extract emails from mailto: links in HTML
pub fn extract_mailto_emails(html: &str) -> Vec<String> {
    let emails = Arc::new(Mutex::new(Vec::new()));
    let emails_clone = Arc::clone(&emails);

    let _ = rewrite_str(
        html,
        RewriteStrSettings {
            element_content_handlers: vec![element!("a[href]", move |el| {
                if let Some(href) = el.get_attribute("href") {
                    if href.starts_with("mailto:") {
                        let email = clean_email(&href);
                        if is_valid_email(&email) && !is_banned_email(&email) {
                            emails_clone.lock().unwrap().push(email);
                        }
                    }
                }
                Ok(())
            })],
            ..Default::default()
        },
    );

    let result = emails.lock().unwrap().clone();

    // Deduplicate
    let set: HashSet<String> = result.into_iter().collect();
    set.into_iter().collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extracts_simple_email() {
        let text = "Contact us at hello@example.com for more info";
        let contacts = extract_contacts(text);
        // Note: example.com is banned
        assert!(contacts.emails.is_empty());

        let text = "Contact us at hello@company.com for more info";
        let contacts = extract_contacts(text);
        assert_eq!(contacts.emails, vec!["hello@company.com"]);
    }

    #[test]
    fn test_extracts_multiple_emails() {
        let text = "Email john@company.com or jane@business.org";
        let contacts = extract_contacts(text);
        assert_eq!(contacts.emails.len(), 2);
        assert!(contacts.emails.contains(&"john@company.com".to_string()));
        assert!(contacts.emails.contains(&"jane@business.org".to_string()));
    }

    #[test]
    fn test_filters_banned_emails() {
        let text = "Email noreply@company.com or support@sentry.io";
        let contacts = extract_contacts(text);
        assert!(contacts.emails.is_empty());
    }

    #[test]
    fn test_filters_sentry_hash_emails() {
        // Sentry uses hash-style emails for error tracking
        let text = "Error from 8c4075d5481d476e945486754f783364@sentry.io";
        let contacts = extract_contacts(text);
        assert!(
            contacts.emails.is_empty(),
            "Sentry hash emails should be filtered"
        );
    }

    #[test]
    fn test_extracts_french_mobile() {
        let text = "Call us at 06 12 34 56 78";
        let contacts = extract_contacts(text);
        assert_eq!(contacts.phones.len(), 1);
        assert_eq!(contacts.phones[0], "0612345678");
    }

    #[test]
    fn test_extracts_french_landline() {
        let text = "Phone: 01 23 45 67 89";
        let contacts = extract_contacts(text);
        assert_eq!(contacts.phones.len(), 1);
        assert_eq!(contacts.phones[0], "0123456789");
    }

    #[test]
    fn test_extracts_international_phone() {
        let text = "Phone: +33 6 12 34 56 78";
        let contacts = extract_contacts(text);
        assert_eq!(contacts.phones.len(), 1);
        assert!(contacts.phones[0].starts_with("+33"));
    }

    #[test]
    fn test_extracts_us_phone() {
        let text = "Call (555) 123-4567";
        let contacts = extract_contacts(text);
        assert_eq!(contacts.phones.len(), 1);
    }

    #[test]
    fn test_rejects_short_numbers() {
        // 05568136 - only 8 digits, not a valid phone
        let text = "Reference: 05568136";
        let contacts = extract_contacts(text);
        assert!(contacts.phones.is_empty());
    }

    #[test]
    fn test_rejects_long_numbers() {
        // 8152506420001 - 13 digits, suspicious pattern
        let text = "ID: 8152506420001";
        let contacts = extract_contacts(text);
        assert!(contacts.phones.is_empty());
    }

    #[test]
    fn test_rejects_placeholder_numbers() {
        let text = "Test: 00 00 00 00 00";
        let contacts = extract_contacts(text);
        assert!(contacts.phones.is_empty()); // Placeholder pattern
    }

    #[test]
    fn test_email_from_url_parameter() {
        let text = "Check https://site.com?email=user@company.com&ref=abc";
        let contacts = extract_contacts(text);
        assert!(contacts.emails.contains(&"user@company.com".to_string()));
    }

    #[test]
    fn test_deduplicates_emails() {
        let text = "Contact hello@company.com or hello@company.com";
        let contacts = extract_contacts(text);
        assert_eq!(contacts.emails.len(), 1);
    }

    #[test]
    fn test_mailto_extraction() {
        let html = r#"<a href="mailto:contact@business.com">Email us</a>"#;
        let emails = extract_mailto_emails(html);
        assert_eq!(emails, vec!["contact@business.com"]);
    }

    #[test]
    fn test_mailto_with_params() {
        let html = r#"<a href="mailto:contact@business.com?subject=Hello">Email</a>"#;
        let emails = extract_mailto_emails(html);
        assert_eq!(emails, vec!["contact@business.com"]);
    }
}
