use axum::Json;
use std::time::Instant;

use crate::error::AppError;
use crate::models::{
    ExtractedContacts, ExtractedLinks, ExtractedScript, ProcessMetadata, ProcessRequest,
    ProcessResponse, ProcessedData,
};
use crate::processing;

/// Main HTML processing endpoint
///
/// Receives HTML content and returns:
/// - Sanitized markdown for RAG indexing
/// - Extracted contacts (emails, phones)
/// - Extracted links (internal, social)
/// - Technology signals (scripts, meta tags, iframes)
pub async fn process_html(
    Json(request): Json<ProcessRequest>,
) -> Result<Json<ProcessResponse>, AppError> {
    let start_time = Instant::now();
    let html_size = request.html.len();

    // Validate URL
    let base_url = url::Url::parse(&request.url)
        .map_err(|e| AppError::InvalidUrl(format!("{}: {}", request.url, e)))?;

    tracing::info!(
        url = %request.url,
        html_size = html_size,
        "Processing HTML"
    );

    // Initialize result containers
    let mut markdown = String::new();
    let mut contacts = ExtractedContacts::default();
    let mut links = ExtractedLinks::default();
    let mut scripts: Vec<ExtractedScript> = Vec::new();

    // Step 1: Sanitize HTML and convert to markdown
    let sanitized_html = processing::sanitizer::sanitize_html(&request.html)
        .map_err(|e| AppError::ProcessingError(format!("Sanitization failed: {}", e)))?;

    // Step 2: Convert to markdown if requested
    if request.options.convert_to_markdown {
        markdown = processing::markdown::html_to_markdown(&sanitized_html)
            .map_err(|e| AppError::ProcessingError(format!("Markdown conversion failed: {}", e)))?;
    }

    // Step 3: Extract text content for contact extraction
    let text_content = processing::text::extract_text(&sanitized_html)
        .map_err(|e| AppError::ProcessingError(format!("Text extraction failed: {}", e)))?;

    // Step 4: Extract contacts if requested
    if request.options.extract_contacts {
        contacts = processing::contacts::extract_contacts(&text_content);

        // Also extract mailto: links from HTML
        let mailto_emails = processing::contacts::extract_mailto_emails(&sanitized_html);
        for email in mailto_emails {
            if !contacts.emails.contains(&email) {
                contacts.emails.push(email);
            }
        }
    }

    // Step 5: Extract links if requested
    if request.options.extract_links {
        links = processing::links::extract_links(&sanitized_html, &base_url)
            .map_err(|e| AppError::ProcessingError(format!("Link extraction failed: {}", e)))?;
    }

    // Step 6: Extract scripts/technology signals if requested
    // Use rawHtml if available (contains script tags), otherwise fall back to html
    if request.options.extract_scripts {
        let html_for_scripts = request.raw_html.as_ref().unwrap_or(&request.html);
        scripts = processing::scripts::extract_scripts(html_for_scripts, &base_url)
            .map_err(|e| AppError::ProcessingError(format!("Script extraction failed: {}", e)))?;
    }

    let processing_time = start_time.elapsed().as_millis() as u64;

    tracing::info!(
        url = %request.url,
        processing_time_ms = processing_time,
        emails_count = contacts.emails.len(),
        phones_count = contacts.phones.len(),
        internal_links_count = links.internal.len(),
        scripts_count = scripts.len(),
        "Processing completed"
    );

    Ok(Json(ProcessResponse {
        success: true,
        data: ProcessedData {
            markdown: markdown.clone(),
            contacts,
            links,
            scripts,
        },
        metadata: ProcessMetadata {
            processing_time_ms: processing_time,
            html_size_bytes: html_size,
            markdown_size_bytes: markdown.len(),
        },
    }))
}
