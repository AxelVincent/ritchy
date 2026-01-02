use once_cell::sync::Lazy;
use regex::Regex;

/// Regex to strip HTML tags
static HTML_TAG_REGEX: Lazy<Regex> = Lazy::new(|| Regex::new(r"<[^>]+>").unwrap());

/// Regexes to match content in tags we want to skip (Rust regex doesn't support backreferences)
static SKIP_SCRIPT_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?is)<script[^>]*>.*?</script>").unwrap());
static SKIP_STYLE_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?is)<style[^>]*>.*?</style>").unwrap());
static SKIP_NAV_REGEX: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?is)<nav[^>]*>.*?</nav>").unwrap());
static SKIP_HEADER_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?is)<header[^>]*>.*?</header>").unwrap());
static SKIP_FOOTER_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?is)<footer[^>]*>.*?</footer>").unwrap());
static SKIP_ASIDE_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?is)<aside[^>]*>.*?</aside>").unwrap());
static SKIP_MENU_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?is)<menu[^>]*>.*?</menu>").unwrap());
static SKIP_NOSCRIPT_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?is)<noscript[^>]*>.*?</noscript>").unwrap());

/// Extract plain text content from HTML.
///
/// Removes all tags and returns only the visible text content,
/// which is used for contact extraction (emails, phones).
pub fn extract_text(html: &str) -> Result<String, lol_html::errors::RewritingError> {
    // First, remove content from tags we want to skip entirely
    let mut result = html.to_string();
    result = SKIP_SCRIPT_REGEX.replace_all(&result, " ").to_string();
    result = SKIP_STYLE_REGEX.replace_all(&result, " ").to_string();
    result = SKIP_NAV_REGEX.replace_all(&result, " ").to_string();
    result = SKIP_HEADER_REGEX.replace_all(&result, " ").to_string();
    result = SKIP_FOOTER_REGEX.replace_all(&result, " ").to_string();
    result = SKIP_ASIDE_REGEX.replace_all(&result, " ").to_string();
    result = SKIP_MENU_REGEX.replace_all(&result, " ").to_string();
    result = SKIP_NOSCRIPT_REGEX.replace_all(&result, " ").to_string();

    // Then strip remaining HTML tags
    let text = HTML_TAG_REGEX.replace_all(&result, " ");

    // Decode common HTML entities
    let decoded = text
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&apos;", "'");

    // Clean up whitespace
    let cleaned = decoded.split_whitespace().collect::<Vec<_>>().join(" ");

    Ok(cleaned)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extracts_text() {
        let html = r#"<html><body><p>Hello World</p></body></html>"#;
        let result = extract_text(html).unwrap();
        assert_eq!(result, "Hello World");
    }

    #[test]
    fn test_handles_nested_tags() {
        let html = r#"<html><body><p>Hello <strong>Bold</strong> World</p></body></html>"#;
        let result = extract_text(html).unwrap();
        assert_eq!(result, "Hello Bold World");
    }

    #[test]
    fn test_normalizes_whitespace() {
        let html = r#"<html><body><p>Hello    World</p></body></html>"#;
        let result = extract_text(html).unwrap();
        assert_eq!(result, "Hello World");
    }

    #[test]
    fn test_extracts_from_multiple_paragraphs() {
        let html = r#"<html><body><p>First</p><p>Second</p></body></html>"#;
        let result = extract_text(html).unwrap();
        assert!(result.contains("First"));
        assert!(result.contains("Second"));
    }

    #[test]
    fn test_removes_script_content() {
        let html = r#"<html><body><script>var x = 1;</script><p>Content</p></body></html>"#;
        let result = extract_text(html).unwrap();
        assert!(!result.contains("var"));
        assert!(result.contains("Content"));
    }

    #[test]
    fn test_removes_nav_content() {
        let html = r#"<html><body><nav>Menu Item</nav><p>Content</p></body></html>"#;
        let result = extract_text(html).unwrap();
        assert!(!result.contains("Menu"));
        assert!(result.contains("Content"));
    }

    #[test]
    fn test_decodes_html_entities() {
        let html = r#"<p>Hello &amp; World</p>"#;
        let result = extract_text(html).unwrap();
        assert_eq!(result, "Hello & World");
    }
}
