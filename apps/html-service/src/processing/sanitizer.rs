use lol_html::{element, rewrite_str, RewriteStrSettings};

/// Tags to completely remove from HTML (including their content)
const REMOVE_TAGS: &[&str] = &[
    "script", "style", "iframe", "noscript", "object", "embed", "canvas", "video", "audio",
    "input", "textarea", "form", "button", "img",
];

/// Attributes to strip from all elements
const REMOVE_ATTRS: &[&str] = &[
    "style",
    "class",
    "id",
    "onload",
    "onerror",
    "onclick",
    "onmouseover",
    "onsubmit",
    "onfocus",
    "onblur",
    "onchange",
    "onkeydown",
    "onkeyup",
    "onkeypress",
];

/// Sanitize HTML by removing unwanted tags and attributes.
///
/// This mirrors the behavior of the Node.js `processHtml` function:
/// - Removes script, style, iframe, and other non-content elements
/// - Strips event handlers and styling attributes
/// - Preserves href attributes for link extraction
///
/// Uses lol_html for streaming, memory-efficient processing.
pub fn sanitize_html(html: &str) -> Result<String, lol_html::errors::RewritingError> {
    // Build the selector for tags to remove
    let remove_selector = REMOVE_TAGS.join(",");

    let element_handlers = vec![
        // Remove unwanted tags entirely (including their content)
        element!(remove_selector, |el| {
            el.remove();
            Ok(())
        }),
        // Strip dangerous/unnecessary attributes from all elements
        element!("*", |el| {
            // Remove listed attributes
            for attr in REMOVE_ATTRS {
                el.remove_attribute(attr);
            }

            // Remove data-* attributes
            let attrs_to_remove: Vec<String> = el
                .attributes()
                .iter()
                .filter(|a| a.name().starts_with("data-"))
                .map(|a| a.name().to_string())
                .collect();

            for attr in attrs_to_remove {
                el.remove_attribute(&attr);
            }

            Ok(())
        }),
    ];

    rewrite_str(
        html,
        RewriteStrSettings {
            element_content_handlers: element_handlers,
            ..Default::default()
        },
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_removes_script_tags() {
        let html = r#"<html><body><script>alert('xss')</script><p>Hello</p></body></html>"#;
        let result = sanitize_html(html).unwrap();
        assert!(!result.contains("script"));
        assert!(!result.contains("alert"));
        assert!(result.contains("Hello"));
    }

    #[test]
    fn test_removes_style_tags() {
        let html = r#"<html><body><style>.red { color: red; }</style><p>Hello</p></body></html>"#;
        let result = sanitize_html(html).unwrap();
        assert!(!result.contains("style"));
        assert!(!result.contains("color"));
        assert!(result.contains("Hello"));
    }

    #[test]
    fn test_removes_event_handlers() {
        let html =
            r#"<html><body><div onclick="alert('xss')" onload="hack()">Hello</div></body></html>"#;
        let result = sanitize_html(html).unwrap();
        assert!(!result.contains("onclick"));
        assert!(!result.contains("onload"));
        assert!(result.contains("Hello"));
    }

    #[test]
    fn test_preserves_href() {
        let html = r#"<html><body><a href="https://example.com">Link</a></body></html>"#;
        let result = sanitize_html(html).unwrap();
        assert!(result.contains("href"));
        assert!(result.contains("https://example.com"));
    }

    #[test]
    fn test_removes_data_attributes() {
        let html =
            r#"<html><body><div data-tracking="123" data-id="abc">Hello</div></body></html>"#;
        let result = sanitize_html(html).unwrap();
        assert!(!result.contains("data-tracking"));
        assert!(!result.contains("data-id"));
        assert!(result.contains("Hello"));
    }

    #[test]
    fn test_removes_class_and_id() {
        let html = r#"<html><body><div class="container" id="main">Hello</div></body></html>"#;
        let result = sanitize_html(html).unwrap();
        assert!(!result.contains("class="));
        assert!(!result.contains("id="));
        assert!(result.contains("Hello"));
    }
}
