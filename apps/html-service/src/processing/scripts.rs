use crate::models::{ExtractedScript, ScriptType};
use lol_html::{element, rewrite_str, RewriteStrSettings};
use once_cell::sync::Lazy;
use regex::Regex;
use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use url::Url;

/// Minimum length for inline code to be extracted
const INLINE_CODE_MIN_LENGTH: usize = 30;

/// Maximum length for inline code extraction
const INLINE_CODE_MAX_LENGTH: usize = 300;

/// Regex for dynamically loaded scripts (e.g., element.src = "https://...")
static DYNAMIC_SCRIPT_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"\.src\s*=\s*["']((https?:)?//[^"']+\.js[^"']*)["']"#).unwrap());

/// Relevant meta tag prefixes for technology detection
const RELEVANT_META_PREFIXES: &[&str] = &["generator", "fb:", "og:", "twitter:", "shopify"];

/// Extract technology signals from HTML.
///
/// This mirrors the behavior of Node.js `extractScripts`:
/// - Script URLs from <script src="..."> tags
/// - Dynamically loaded script URLs from inline code
/// - Inline script snippets (first 300 chars)
/// - Relevant meta tags (generator, OpenGraph, etc.)
/// - Iframe sources for embedded widgets
pub fn extract_scripts(
    html: &str,
    base_url: &Url,
) -> Result<Vec<ExtractedScript>, lol_html::errors::RewritingError> {
    let scripts = Arc::new(Mutex::new(Vec::new()));
    let seen_urls = Arc::new(Mutex::new(HashSet::new()));

    let scripts_urls = Arc::clone(&scripts);
    let seen_urls_clone = Arc::clone(&seen_urls);

    let scripts_meta = Arc::clone(&scripts);

    let scripts_iframe = Arc::clone(&scripts);

    let base_url_clone = base_url.clone();

    rewrite_str(
        html,
        RewriteStrSettings {
            element_content_handlers: vec![
                // 1. Extract script URLs from <script src="..."> tags
                element!("script[src]", move |el| {
                    if let Some(src) = el.get_attribute("src") {
                        let absolute_url = normalize_script_url(&src, &base_url_clone);
                        let mut seen = seen_urls_clone.lock().unwrap();
                        if !seen.contains(&absolute_url) {
                            seen.insert(absolute_url.clone());
                            scripts_urls.lock().unwrap().push(ExtractedScript {
                                script_type: ScriptType::ScriptUrl,
                                value: absolute_url,
                            });
                        }
                    }
                    Ok(())
                }),
                // 2. Extract inline scripts - handled separately via regex in extract_inline_scripts
                element!("script:not([src])", move |_el| {
                    // lol_html doesn't give us direct text content access
                    // Inline scripts are extracted separately via regex
                    Ok(())
                }),
                // 3. Extract meta tags
                element!("meta[name], meta[property]", move |el| {
                    let name = el
                        .get_attribute("name")
                        .or_else(|| el.get_attribute("property"));
                    let content = el.get_attribute("content");

                    if let (Some(name), Some(content)) = (name, content) {
                        let lower_name = name.to_lowercase();
                        let is_relevant = RELEVANT_META_PREFIXES
                            .iter()
                            .any(|prefix| lower_name.starts_with(prefix));

                        if is_relevant {
                            scripts_meta.lock().unwrap().push(ExtractedScript {
                                script_type: ScriptType::MetaTag,
                                value: format!("{}:{}", name, content),
                            });
                        }
                    }
                    Ok(())
                }),
                // 4. Extract iframe sources
                element!("iframe[src]", move |el| {
                    if let Some(src) = el.get_attribute("src") {
                        scripts_iframe.lock().unwrap().push(ExtractedScript {
                            script_type: ScriptType::Iframe,
                            value: src,
                        });
                    }
                    Ok(())
                }),
            ],
            ..Default::default()
        },
    )?;

    // Also extract inline scripts by parsing the HTML directly
    // (lol_html text handlers are complex for this case)
    extract_inline_scripts(html, &scripts);

    // Extract dynamically loaded scripts from inline code
    extract_dynamic_scripts(html, base_url, &scripts, &seen_urls);

    let result = scripts.lock().unwrap().clone();
    Ok(result)
}

/// Normalize a script URL to absolute format
fn normalize_script_url(src: &str, base_url: &Url) -> String {
    if src.starts_with("http") {
        return src.to_string();
    }

    if src.starts_with("//") {
        return format!("https:{}", src);
    }

    // Try to resolve as relative URL
    match base_url.join(src) {
        Ok(url) => url.to_string(),
        Err(_) => src.to_string(),
    }
}

/// Extract inline scripts using regex
fn extract_inline_scripts(html: &str, scripts: &Arc<Mutex<Vec<ExtractedScript>>>) {
    // Simple regex to find inline script content
    let script_regex = Regex::new(r"<script[^>]*>([^<]+)</script>").unwrap();

    for cap in script_regex.captures_iter(html) {
        if let Some(content) = cap.get(1) {
            let code = content.as_str().trim();

            // Skip empty, short, or JSON-only scripts
            if code.len() < INLINE_CODE_MIN_LENGTH || code.starts_with('{') || code.starts_with('[')
            {
                continue;
            }

            scripts.lock().unwrap().push(ExtractedScript {
                script_type: ScriptType::InlineCode,
                value: if code.len() > INLINE_CODE_MAX_LENGTH {
                    code[..INLINE_CODE_MAX_LENGTH].to_string()
                } else {
                    code.to_string()
                },
            });
        }
    }
}

/// Extract dynamically loaded script URLs from inline JavaScript
fn extract_dynamic_scripts(
    html: &str,
    base_url: &Url,
    scripts: &Arc<Mutex<Vec<ExtractedScript>>>,
    seen_urls: &Arc<Mutex<HashSet<String>>>,
) {
    for cap in DYNAMIC_SCRIPT_REGEX.captures_iter(html) {
        if let Some(src) = cap.get(1) {
            let absolute_url = normalize_script_url(src.as_str(), base_url);
            let mut seen = seen_urls.lock().unwrap();
            if !seen.contains(&absolute_url) {
                seen.insert(absolute_url.clone());
                scripts.lock().unwrap().push(ExtractedScript {
                    script_type: ScriptType::ScriptUrl,
                    value: absolute_url,
                });
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base_url() -> Url {
        Url::parse("https://www.example.com/page").unwrap()
    }

    #[test]
    fn test_extracts_script_urls() {
        let html = r#"<script src="https://cdn.example.com/app.js"></script>"#;
        let scripts = extract_scripts(html, &base_url()).unwrap();
        assert!(scripts
            .iter()
            .any(|s| s.script_type == ScriptType::ScriptUrl
                && s.value.contains("cdn.example.com/app.js")));
    }

    #[test]
    fn test_resolves_relative_script_urls() {
        let html = r#"<script src="/js/main.js"></script>"#;
        let scripts = extract_scripts(html, &base_url()).unwrap();
        assert!(scripts
            .iter()
            .any(|s| s.script_type == ScriptType::ScriptUrl
                && s.value == "https://www.example.com/js/main.js"));
    }

    #[test]
    fn test_extracts_protocol_relative_urls() {
        let html = r#"<script src="//cdn.example.com/lib.js"></script>"#;
        let scripts = extract_scripts(html, &base_url()).unwrap();
        assert!(scripts
            .iter()
            .any(|s| s.script_type == ScriptType::ScriptUrl
                && s.value == "https://cdn.example.com/lib.js"));
    }

    #[test]
    fn test_extracts_meta_tags() {
        let html = r#"<meta name="generator" content="WordPress 6.0">"#;
        let scripts = extract_scripts(html, &base_url()).unwrap();
        assert!(scripts.iter().any(|s| s.script_type == ScriptType::MetaTag
            && s.value.contains("generator")
            && s.value.contains("WordPress")));
    }

    #[test]
    fn test_extracts_og_meta_tags() {
        let html = r#"<meta property="og:type" content="website">"#;
        let scripts = extract_scripts(html, &base_url()).unwrap();
        assert!(scripts
            .iter()
            .any(|s| s.script_type == ScriptType::MetaTag && s.value.contains("og:type")));
    }

    #[test]
    fn test_skips_irrelevant_meta_tags() {
        let html = r#"<meta name="description" content="A website">"#;
        let scripts = extract_scripts(html, &base_url()).unwrap();
        assert!(scripts
            .iter()
            .all(|s| s.script_type != ScriptType::MetaTag || !s.value.contains("description")));
    }

    #[test]
    fn test_extracts_iframes() {
        let html = r#"<iframe src="https://www.youtube.com/embed/xyz"></iframe>"#;
        let scripts = extract_scripts(html, &base_url()).unwrap();
        assert!(scripts
            .iter()
            .any(|s| s.script_type == ScriptType::Iframe && s.value.contains("youtube.com/embed")));
    }

    #[test]
    fn test_extracts_inline_code() {
        let html = r#"<script>var config = { apiKey: "abc123", enabled: true };</script>"#;
        let scripts = extract_scripts(html, &base_url()).unwrap();
        assert!(scripts
            .iter()
            .any(|s| s.script_type == ScriptType::InlineCode && s.value.contains("apiKey")));
    }

    #[test]
    fn test_skips_json_scripts() {
        let html = r#"<script type="application/ld+json">{"@type": "Organization"}</script>"#;
        let scripts = extract_scripts(html, &base_url()).unwrap();
        // JSON-LD should be skipped (starts with {)
        assert!(scripts
            .iter()
            .all(|s| s.script_type != ScriptType::InlineCode || !s.value.contains("@type")));
    }

    #[test]
    fn test_deduplicates_script_urls() {
        let html = r#"
            <script src="https://cdn.example.com/app.js"></script>
            <script src="https://cdn.example.com/app.js"></script>
        "#;
        let scripts = extract_scripts(html, &base_url()).unwrap();
        let url_count = scripts
            .iter()
            .filter(|s| s.script_type == ScriptType::ScriptUrl && s.value.contains("app.js"))
            .count();
        assert_eq!(url_count, 1);
    }
}
