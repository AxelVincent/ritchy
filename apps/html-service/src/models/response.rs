use serde::Serialize;

/// Successful response from the /process endpoint
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessResponse {
    pub success: bool,
    pub data: ProcessedData,
    pub metadata: ProcessMetadata,
}

/// Main data payload containing all extracted information
#[derive(Debug, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProcessedData {
    /// Markdown content for RAG indexing
    pub markdown: String,

    /// Extracted contact information
    pub contacts: ExtractedContacts,

    /// Extracted links categorized by type
    pub links: ExtractedLinks,

    /// Technology signals (scripts, meta tags, iframes)
    pub scripts: Vec<ExtractedScript>,
}

/// Contact information extracted from the page
#[derive(Debug, Serialize, Default)]
pub struct ExtractedContacts {
    pub emails: Vec<String>,
    pub phones: Vec<String>,
}

/// Links extracted and categorized from the page
#[derive(Debug, Serialize, Default)]
pub struct ExtractedLinks {
    /// Internal links (same domain)
    pub internal: Vec<String>,

    /// Social media links
    pub social: SocialLinks,
}

/// Social media links by platform
#[derive(Debug, Serialize, Default)]
pub struct SocialLinks {
    pub instagram: Vec<InstagramLink>,
    pub facebook: Vec<FacebookLink>,
    pub linkedin: Vec<LinkedinLink>,
}

#[derive(Debug, Serialize, Clone, PartialEq, Eq, Hash)]
pub struct InstagramLink {
    pub url: String,
    pub username: String,
}

#[derive(Debug, Serialize, Clone, PartialEq, Eq, Hash)]
pub struct FacebookLink {
    pub url: String,
    pub username: String,
}

#[derive(Debug, Serialize, Clone, PartialEq, Eq, Hash)]
pub struct LinkedinLink {
    pub url: String,
    pub name: String,
    #[serde(rename = "type")]
    pub link_type: String,
}

/// Technology signal extracted from the page
#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExtractedScript {
    #[serde(rename = "type")]
    pub script_type: ScriptType,
    pub value: String,
}

#[derive(Debug, Serialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ScriptType {
    ScriptUrl,
    InlineCode,
    MetaTag,
    Iframe,
}

/// Metadata about the processing operation
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessMetadata {
    /// Time taken to process in milliseconds
    pub processing_time_ms: u64,

    /// Size of input HTML in bytes
    pub html_size_bytes: usize,

    /// Size of output markdown in bytes
    pub markdown_size_bytes: usize,
}
