use serde::Deserialize;

/// Request body for the /process endpoint
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessRequest {
    /// Pre-processed HTML from scraper (required)
    pub html: String,

    /// Unprocessed HTML for technology detection (optional)
    #[serde(default)]
    pub raw_html: Option<String>,

    /// Page URL for link resolution (required)
    pub url: String,

    /// Processing options (optional, defaults to all enabled)
    #[serde(default)]
    pub options: ProcessOptions,
}

/// Options to control which extraction operations to perform
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessOptions {
    /// Extract email and phone contacts (default: true)
    #[serde(default = "default_true")]
    pub extract_contacts: bool,

    /// Extract internal and social links (default: true)
    #[serde(default = "default_true")]
    pub extract_links: bool,

    /// Extract script URLs, meta tags, iframes (default: true)
    #[serde(default = "default_true")]
    pub extract_scripts: bool,

    /// Convert HTML to markdown (default: true)
    #[serde(default = "default_true")]
    pub convert_to_markdown: bool,
}

impl Default for ProcessOptions {
    fn default() -> Self {
        Self {
            extract_contacts: true,
            extract_links: true,
            extract_scripts: true,
            convert_to_markdown: true,
        }
    }
}

fn default_true() -> bool {
    true
}
