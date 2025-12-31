use crate::models::{ExtractedLinks, FacebookLink, InstagramLink, LinkedinLink, SocialLinks};
use lol_html::{element, rewrite_str, RewriteStrSettings};
use once_cell::sync::Lazy;
use regex::Regex;
use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use url::Url;

/// Regex for extracting Instagram usernames
static INSTAGRAM_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?:www\.)?instagram\.com/(_u/)?([^/?#&]+)").unwrap());

/// Regex for extracting Facebook usernames
/// Note: We don't use negative lookahead here since Rust's regex crate doesn't support it.
/// Instead, we filter out excluded paths in the normalize_facebook function.
static FACEBOOK_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?:www\.)?facebook\.com/([\w.]+)").unwrap());

/// Regex for extracting LinkedIn personal profiles
static LINKEDIN_PERSONAL_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?:www\.)?linkedin\.com/in/([\w\-%.]+)").unwrap());

/// Regex for extracting LinkedIn company profiles
static LINKEDIN_COMPANY_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?:www\.)?linkedin\.com/company/([\w\-%.]+)").unwrap());

/// Paths to exclude from Facebook links
const FACEBOOK_EXCLUDED_PATHS: &[&str] = &[
    "posts/",
    "p/",
    "photos/",
    "pages/",
    "groups/",
    "events/",
    "help/",
    "sharer.php/",
    "profile.php",
    "sharer",
    "stories",
    "photo.php",
    "ad_campaign",
    "people",
    "pg",
    "l.php",
];

/// File extensions that indicate non-web content
const NON_WEB_EXTENSIONS: &[&str] = &[
    ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".ico", ".doc", ".docx", ".xls",
    ".xlsx", ".ppt", ".pptx", ".zip", ".rar", ".tar", ".gz", ".mp3", ".mp4", ".wav", ".avi",
    ".mov", ".css", ".js", ".xml", ".json",
];

/// Extract all links from HTML, categorized by type.
pub fn extract_links(
    html: &str,
    base_url: &Url,
) -> Result<ExtractedLinks, lol_html::errors::RewritingError> {
    let internal_links: Arc<Mutex<HashSet<String>>> = Arc::new(Mutex::new(HashSet::new()));
    let instagram_links: Arc<Mutex<HashSet<InstagramLink>>> = Arc::new(Mutex::new(HashSet::new()));
    let facebook_links: Arc<Mutex<HashSet<FacebookLink>>> = Arc::new(Mutex::new(HashSet::new()));
    let linkedin_links: Arc<Mutex<HashSet<LinkedinLink>>> = Arc::new(Mutex::new(HashSet::new()));

    let internal_clone = Arc::clone(&internal_links);
    let instagram_clone = Arc::clone(&instagram_links);
    let facebook_clone = Arc::clone(&facebook_links);
    let linkedin_clone = Arc::clone(&linkedin_links);

    let main_domain = get_main_domain(base_url);
    let base_url_clone = base_url.clone();

    rewrite_str(
        html,
        RewriteStrSettings {
            element_content_handlers: vec![element!("a[href]", move |el| {
                if let Some(href) = el.get_attribute("href") {
                    // Skip mailto:, tel:, javascript:
                    if href.starts_with("mailto:")
                        || href.starts_with("tel:")
                        || href.starts_with("javascript:")
                    {
                        return Ok(());
                    }

                    // Resolve relative URLs
                    let resolved_url = match resolve_url(&base_url_clone, &href) {
                        Some(url) => url,
                        None => return Ok(()),
                    };

                    let url_str = resolved_url.as_str();
                    let url_lower = url_str.to_lowercase();

                    // Skip non-web content
                    if !is_web_content_url(&url_lower) {
                        return Ok(());
                    }

                    // Check for social media
                    if url_lower.contains("instagram.com") {
                        if let Some(ig) = normalize_instagram(&url_lower) {
                            instagram_clone.lock().unwrap().insert(ig);
                        }
                    } else if url_lower.contains("facebook.com") {
                        if let Some(fb) = normalize_facebook(&url_lower) {
                            facebook_clone.lock().unwrap().insert(fb);
                        }
                    } else if url_lower.contains("linkedin.com") {
                        if let Some(li) = normalize_linkedin(&url_lower) {
                            linkedin_clone.lock().unwrap().insert(li);
                        }
                    } else if url_lower.contains(&main_domain) {
                        // Internal link
                        let normalized = normalize_internal_url(&resolved_url);
                        if !normalized.is_empty() {
                            internal_clone.lock().unwrap().insert(normalized);
                        }
                    }
                }
                Ok(())
            })],
            ..Default::default()
        },
    )?;

    // Collect results from Arc<Mutex<HashSet>>
    let internal_result: Vec<String> = internal_links.lock().unwrap().iter().cloned().collect();
    let instagram_result: Vec<InstagramLink> =
        instagram_links.lock().unwrap().iter().cloned().collect();
    let facebook_result: Vec<FacebookLink> =
        facebook_links.lock().unwrap().iter().cloned().collect();
    let linkedin_result: Vec<LinkedinLink> =
        linkedin_links.lock().unwrap().iter().cloned().collect();

    Ok(ExtractedLinks {
        internal: internal_result,
        social: SocialLinks {
            instagram: instagram_result,
            facebook: facebook_result,
            linkedin: linkedin_result,
        },
    })
}

/// Get the main domain from a URL
fn get_main_domain(url: &Url) -> String {
    url.host_str()
        .unwrap_or("")
        .trim_start_matches("www.")
        .to_lowercase()
}

/// Resolve a potentially relative URL against a base URL
fn resolve_url(base: &Url, href: &str) -> Option<Url> {
    if let Ok(url) = Url::parse(href) {
        return Some(url);
    }
    base.join(href).ok()
}

/// Check if URL points to web content
fn is_web_content_url(url: &str) -> bool {
    let lower = url.to_lowercase();
    !NON_WEB_EXTENSIONS.iter().any(|ext| lower.ends_with(ext))
}

/// Normalize internal URL for storage
fn normalize_internal_url(url: &Url) -> String {
    let mut normalized = format!(
        "{}://{}{}",
        url.scheme(),
        url.host_str().unwrap_or(""),
        url.path()
    );

    if normalized.ends_with('/') && normalized.len() > 1 {
        normalized.pop();
    }

    if let Some(query) = url.query() {
        normalized.push('?');
        normalized.push_str(query);
    }

    normalized
}

/// Normalize Instagram URL and extract username
fn normalize_instagram(url: &str) -> Option<InstagramLink> {
    let lower = url.to_lowercase();

    if lower == "https://instagram.com"
        || lower == "https://www.instagram.com"
        || lower.contains("instagram.com/p/")
        || lower.contains("instagram.com/reel/")
    {
        return None;
    }

    if let Some(caps) = INSTAGRAM_REGEX.captures(url) {
        if let Some(username_match) = caps.get(2) {
            let username = username_match.as_str().to_string();

            if username.is_empty()
                || username.to_lowercase() == "p"
                || username.to_lowercase() == "reel"
            {
                return None;
            }

            return Some(InstagramLink {
                url: format!("https://www.instagram.com/{}", username),
                username,
            });
        }
    }

    None
}

/// Normalize Facebook URL and extract username
fn normalize_facebook(url: &str) -> Option<FacebookLink> {
    let lower = url.to_lowercase();

    if lower == "https://facebook.com" || lower == "https://www.facebook.com" {
        return None;
    }

    if FACEBOOK_EXCLUDED_PATHS
        .iter()
        .any(|path| lower.contains(&format!("facebook.com/{}", path)))
    {
        return None;
    }

    if let Some(caps) = FACEBOOK_REGEX.captures(url) {
        if let Some(username_match) = caps.get(1) {
            let username = username_match.as_str().to_string();

            if username.is_empty()
                || ["posts", "photos", "pages", "groups", "events"]
                    .contains(&username.to_lowercase().as_str())
            {
                return None;
            }

            return Some(FacebookLink {
                url: format!("https://www.facebook.com/{}", username),
                username,
            });
        }
    }

    None
}

/// Normalize LinkedIn URL and extract profile info
fn normalize_linkedin(url: &str) -> Option<LinkedinLink> {
    let lower = url.to_lowercase();

    if lower == "https://linkedin.com"
        || lower == "https://www.linkedin.com"
        || lower.contains("linkedin.com/school/")
        || lower.contains("linkedin.com/groups/")
        || lower.contains("linkedin.com/pulse/")
        || lower.contains("linkedin.com/feed/")
    {
        return None;
    }

    // Try personal profile first
    if let Some(caps) = LINKEDIN_PERSONAL_REGEX.captures(url) {
        if let Some(name_match) = caps.get(1) {
            let name = name_match.as_str().to_string();

            if !name.is_empty()
                && !["jobs", "school", "groups", "pulse", "feed"]
                    .contains(&name.to_lowercase().as_str())
            {
                return Some(LinkedinLink {
                    url: format!("https://www.linkedin.com/in/{}", name),
                    name,
                    link_type: "personal".to_string(),
                });
            }
        }
    }

    // Try company profile
    if let Some(caps) = LINKEDIN_COMPANY_REGEX.captures(url) {
        if let Some(name_match) = caps.get(1) {
            let name = name_match.as_str().to_string();

            if !name.is_empty()
                && !["jobs", "school", "groups", "pulse", "feed"]
                    .contains(&name.to_lowercase().as_str())
            {
                return Some(LinkedinLink {
                    url: format!("https://www.linkedin.com/company/{}", name),
                    name,
                    link_type: "company".to_string(),
                });
            }
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base_url() -> Url {
        Url::parse("https://www.example.com/page").unwrap()
    }

    #[test]
    fn test_extracts_internal_links() {
        let html =
            r#"<a href="/about">About</a><a href="https://www.example.com/contact">Contact</a>"#;
        let links = extract_links(html, &base_url()).unwrap();
        assert!(links.internal.iter().any(|l| l.contains("/about")));
        assert!(links.internal.iter().any(|l| l.contains("/contact")));
    }

    #[test]
    fn test_skips_external_links() {
        let html = r#"<a href="https://other-site.com/page">External</a>"#;
        let links = extract_links(html, &base_url()).unwrap();
        assert!(links.internal.is_empty());
    }

    #[test]
    fn test_extracts_instagram() {
        let html = r#"<a href="https://www.instagram.com/ritchy_official">Instagram</a>"#;
        let links = extract_links(html, &base_url()).unwrap();
        assert_eq!(links.social.instagram.len(), 1);
        assert_eq!(links.social.instagram[0].username, "ritchy_official");
    }

    #[test]
    fn test_skips_instagram_posts() {
        let html = r#"<a href="https://www.instagram.com/p/ABC123">Post</a>"#;
        let links = extract_links(html, &base_url()).unwrap();
        assert!(links.social.instagram.is_empty());
    }

    #[test]
    fn test_extracts_facebook() {
        let html = r#"<a href="https://www.facebook.com/ritchycompany">Facebook</a>"#;
        let links = extract_links(html, &base_url()).unwrap();
        assert_eq!(links.social.facebook.len(), 1);
        assert_eq!(links.social.facebook[0].username, "ritchycompany");
    }

    #[test]
    fn test_extracts_linkedin_company() {
        let html = r#"<a href="https://www.linkedin.com/company/ritchy">LinkedIn</a>"#;
        let links = extract_links(html, &base_url()).unwrap();
        assert_eq!(links.social.linkedin.len(), 1);
        assert_eq!(links.social.linkedin[0].name, "ritchy");
        assert_eq!(links.social.linkedin[0].link_type, "company");
    }

    #[test]
    fn test_extracts_linkedin_personal() {
        let html = r#"<a href="https://www.linkedin.com/in/john-doe">LinkedIn</a>"#;
        let links = extract_links(html, &base_url()).unwrap();
        assert_eq!(links.social.linkedin.len(), 1);
        assert_eq!(links.social.linkedin[0].name, "john-doe");
        assert_eq!(links.social.linkedin[0].link_type, "personal");
    }

    #[test]
    fn test_skips_pdf_links() {
        let html = r#"<a href="/documents/brochure.pdf">Download PDF</a>"#;
        let links = extract_links(html, &base_url()).unwrap();
        assert!(links.internal.is_empty());
    }
}
