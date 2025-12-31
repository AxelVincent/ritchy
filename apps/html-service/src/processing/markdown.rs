use lol_html::{element, rewrite_str, RewriteStrSettings};

/// Tags to completely remove (navigation/noise elements)
const REMOVE_TAGS: &[&str] = &[
    "nav", "header", "footer", "aside", "meta", "noscript", "menu",
];

/// Convert HTML to clean Markdown optimized for RAG vectorization.
pub fn html_to_markdown(html: &str) -> Result<String, lol_html::errors::RewritingError> {
    let remove_selector = REMOVE_TAGS.join(",");

    let element_handlers = vec![
        // Remove noise elements
        element!(remove_selector, |el| {
            el.remove();
            Ok(())
        }),
        // Headers - prepend markdown syntax
        element!("h1", |el| {
            el.prepend("\n\n# ", lol_html::html_content::ContentType::Text);
            el.append("\n\n", lol_html::html_content::ContentType::Text);
            Ok(())
        }),
        element!("h2", |el| {
            el.prepend("\n\n## ", lol_html::html_content::ContentType::Text);
            el.append("\n\n", lol_html::html_content::ContentType::Text);
            Ok(())
        }),
        element!("h3", |el| {
            el.prepend("\n\n### ", lol_html::html_content::ContentType::Text);
            el.append("\n\n", lol_html::html_content::ContentType::Text);
            Ok(())
        }),
        element!("h4", |el| {
            el.prepend("\n\n#### ", lol_html::html_content::ContentType::Text);
            el.append("\n\n", lol_html::html_content::ContentType::Text);
            Ok(())
        }),
        element!("h5", |el| {
            el.prepend("\n\n##### ", lol_html::html_content::ContentType::Text);
            el.append("\n\n", lol_html::html_content::ContentType::Text);
            Ok(())
        }),
        element!("h6", |el| {
            el.prepend("\n\n###### ", lol_html::html_content::ContentType::Text);
            el.append("\n\n", lol_html::html_content::ContentType::Text);
            Ok(())
        }),
        // Paragraphs
        element!("p", |el| {
            el.append("\n\n", lol_html::html_content::ContentType::Text);
            Ok(())
        }),
        // Line breaks
        element!("br", |el| {
            el.replace(" ", lol_html::html_content::ContentType::Text);
            Ok(())
        }),
        // Bold/strong
        element!("strong, b", |el| {
            el.prepend("**", lol_html::html_content::ContentType::Text);
            el.append("**", lol_html::html_content::ContentType::Text);
            Ok(())
        }),
        // Italic/emphasis
        element!("em, i", |el| {
            el.prepend("*", lol_html::html_content::ContentType::Text);
            el.append("*", lol_html::html_content::ContentType::Text);
            Ok(())
        }),
        // Lists
        element!("ul, ol", |el| {
            el.prepend("\n", lol_html::html_content::ContentType::Text);
            el.append("\n\n", lol_html::html_content::ContentType::Text);
            Ok(())
        }),
        // List items
        element!("li", |el| {
            el.prepend("- ", lol_html::html_content::ContentType::Text);
            el.append("\n", lol_html::html_content::ContentType::Text);
            Ok(())
        }),
        // Links
        element!("a[href]", |el| {
            if let Some(href) = el.get_attribute("href") {
                if !href.starts_with("mailto:") && !href.starts_with("javascript:") {
                    el.prepend("[", lol_html::html_content::ContentType::Text);
                    el.append(
                        &format!("]({})", href),
                        lol_html::html_content::ContentType::Text,
                    );
                }
            }
            Ok(())
        }),
        // Divs add spacing
        element!("div", |el| {
            el.append("\n", lol_html::html_content::ContentType::Text);
            Ok(())
        }),
    ];

    let result = rewrite_str(
        html,
        RewriteStrSettings {
            element_content_handlers: element_handlers,
            ..Default::default()
        },
    )?;

    Ok(post_process_markdown(&result))
}

/// Post-process markdown to clean up formatting
fn post_process_markdown(markdown: &str) -> String {
    let mut result = String::with_capacity(markdown.len());
    let mut newline_count = 0;

    for line in markdown.lines() {
        let trimmed = line.trim();

        if trimmed.is_empty() {
            if newline_count < 2 {
                result.push('\n');
                newline_count += 1;
            }
            continue;
        }

        newline_count = 0;

        // Skip very short lines unless they're headers or list items
        if trimmed.len() < 10 && !trimmed.starts_with('#') && !trimmed.starts_with('-') {
            continue;
        }

        if !result.is_empty() && !result.ends_with('\n') {
            result.push('\n');
        }
        result.push_str(trimmed);
    }

    // Normalize spaces within lines
    let cleaned: String = result
        .lines()
        .map(|line| line.split_whitespace().collect::<Vec<_>>().join(" "))
        .collect::<Vec<_>>()
        .join("\n");

    // Limit consecutive newlines
    let mut final_result = String::with_capacity(cleaned.len());
    let mut consecutive_newlines = 0;

    for c in cleaned.chars() {
        if c == '\n' {
            consecutive_newlines += 1;
            if consecutive_newlines <= 2 {
                final_result.push(c);
            }
        } else {
            consecutive_newlines = 0;
            final_result.push(c);
        }
    }

    final_result.trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_converts_headers() {
        let html = r#"<h1>Title</h1><h2>Subtitle</h2>"#;
        let result = html_to_markdown(html).unwrap();
        assert!(result.contains("# Title"));
        assert!(result.contains("## Subtitle"));
    }

    #[test]
    fn test_converts_bold() {
        let html = r#"<p>This is <strong>bold</strong> text</p>"#;
        let result = html_to_markdown(html).unwrap();
        assert!(result.contains("**bold**"));
    }

    #[test]
    fn test_converts_italic() {
        let html = r#"<p>This is <em>italic</em> text</p>"#;
        let result = html_to_markdown(html).unwrap();
        assert!(result.contains("*italic*"));
    }

    #[test]
    fn test_converts_links() {
        let html = r#"<p>Visit <a href="https://example.com">Example</a></p>"#;
        let result = html_to_markdown(html).unwrap();
        assert!(result.contains("[Example](https://example.com)"));
    }

    #[test]
    fn test_converts_lists() {
        let html = r#"<ul><li>First item</li><li>Second item</li></ul>"#;
        let result = html_to_markdown(html).unwrap();
        assert!(result.contains("- First item"));
        assert!(result.contains("- Second item"));
    }

    #[test]
    fn test_removes_nav() {
        let html = r#"<nav><a href="/">Home</a></nav><p>Content here is good</p>"#;
        let result = html_to_markdown(html).unwrap();
        assert!(!result.contains("Home"));
        assert!(result.contains("Content"));
    }
}
